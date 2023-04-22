from datetime import datetime, timedelta
from ivis import ivis

'''
Aggregates and accumulates subscription counts from a given list tracker.
It *might* support even other types of subscribed states, but those are used
more by the system rather than by the users, and would require additional
logging (e.g. in /server/services/gdpr-cleanup) for little benefit.
'''

#region HELPERS

es = ivis.elasticsearch
state = ivis.state or {}
params = ivis.params
entities = ivis.entities
owned = ivis.owned

def log(message):
  print(message)

def parse_date(iso_date):
  # elasticsearch returns UTC iso format to a millisecond range, ended by 'Z'
  parseable_date = iso_date[:-1] + '000' # add microseconds
  return datetime.strptime(parseable_date, '%Y-%m-%dT%H:%M:%S.%f')

class Signal:
  def __init__(self, sigset_cid, signal_cid):
    self.cid = signal_cid
    signal = entities['signals'][sigset_cid][signal_cid]
    self.field = signal['field']
    self.name = signal['name']
    self.namespace = signal['namespace']

class SignalSet:
  def __init__(self, sigset_cid):
    sigset = entities['signalSets'][sigset_cid]
    self.cid = sigset_cid
    self.index = sigset['index']
    self.name = sigset['name']
    self.namespace = sigset['namespace']

  def get_signal(self, signal_cid):
    return Signal(self.cid, signal_cid)

  def es_index_doc(self, id, doc):
    return es.index(index=self.index, id=id, doc_type='_doc', body=doc)

  def es_search(self, req_body):
    return es.search(index=self.index, body=req_body)

  def es_delete_by_query(self, req_body):
    return es.delete_by_query(index=self.index, body=req_body)

def get_signal_set(sigset_cid):
  return SignalSet(sigset_cid)

#endregion


SUBSCRIPTION_STATUS = {
  'subscribed': 1,
  # 'unsubscribed': 2,
  # 'bounced': 3,
  # 'complained': 4,
}
TIMESTAMP_CID = 'timestamp'
SYNCHRONIZE_ACTIVITY = 19

# bucket size interval
INTERVAL = '60s'
INTERVAL_MILLIS = 60_000

list_id = params['listId']
creation_timestamp = params['creationTimestamp'] # may be '' for unknown or otherwise undefined
list_tracker_cid = params['listTracker']
list_subs_cid = params['listSubscriptionsCid']

last_output_ts = state.get('last_output_ts')

list_tracker = get_signal_set(list_tracker_cid)
list_tracker_ts = list_tracker.get_signal(TIMESTAMP_CID)
list_tracker_status = list_tracker.get_signal('subscriptionStatus')
list_tracker_prev_status = list_tracker.get_signal('previousSubscriptionStatus')
list_tracker_activity = list_tracker.get_signal('activityType')
list_tracker_sub_count = list_tracker.get_signal('sync_subscriber_count')

target_namespace = list_tracker.namespace

def get_bucket_end_ts(bucket_start_timestamp):
  b_end = parse_date(bucket_start_timestamp)
  b_end += timedelta(milliseconds=INTERVAL_MILLIS)
  return b_end.isoformat()

def insert_zeros_record(timestamp):
  list_subs = get_signal_set(list_subs_cid)
  doc = { list_subs.get_signal(TIMESTAMP_CID).field: timestamp }

  for status in SUBSCRIPTION_STATUS:
    doc[list_subs.get_signal(status).field] = 0

  list_subs.es_index_doc(timestamp, doc)

def create_list_subs_with_first_entry():
  signals = [{
    'cid': TIMESTAMP_CID,
    'name': 'Timestamp',
    'namespace': target_namespace,
    'type': 'date',
    'indexed': True,
    'weight_list': 0,
    'weight_edit': 0,
  }]

  for i, status in enumerate(SUBSCRIPTION_STATUS):
    signals.append({
      'cid': status,
      'name': f'{status} subscriptions',
      'description': f'Number of {status} subscriptions',
      'namespace': target_namespace,
      'type': 'integer',
      'indexed': False,
      'weight_list': i + 1,
      'weight_edit': i + 1,
    })

  ivis.create_signal_set(
    list_subs_cid,
    target_namespace,
    f'List {list_id} subscriptions',
    f'Subscription counts for list {list_id}',
    None,
    signals)

  if (creation_timestamp != ''):
    insert_zeros_record(creation_timestamp)


if owned['signalSets'].get(list_subs_cid) is None:
  create_list_subs_with_first_entry()
  log('Signal set initialisation complete.')
  exit(0)


list_subs = get_signal_set(list_subs_cid)
list_subs_ts = list_subs.get_signal(TIMESTAMP_CID)


def get_count_aggs():
  count_aggs = {}
  for status in SUBSCRIPTION_STATUS:
    count_aggs[status] = {
      'filter': {
        'term': {
          list_tracker_status.field: {
            'value': SUBSCRIPTION_STATUS[status]
          }
        }
      }
    }
    count_aggs[f'prev_{status}'] = {
      'filter': {
        'term': {
          list_tracker_prev_status.field: {
            'value': SUBSCRIPTION_STATUS[status]
          }
        }
      }
    }
    count_aggs['sync'] = {
      'filter': {
        'term': {
          list_tracker_activity.field: {
            'value': SYNCHRONIZE_ACTIVITY
          }
        }
      }
    }
  return count_aggs

def get_list_subs_query():
  if last_output_ts is not None:
    query_content = {
      'bool': {
        'filter': {
          'range': {
            list_tracker_ts.field: { 'gte': last_output_ts }
          }
        }
      }
    }
  else:
    query_content = { 'match_all': {} }

  # query meaning: for buckets of given intervals { for each relevant value { return their count } }
  return {
    'size': 0,
    'query': query_content,
    'aggs': {
      'values_by_time_interval': {
        'date_histogram': {
          'field': list_tracker_ts.field,
          # on update to newer elasticsearch, update to fixed_interval
          'interval': INTERVAL
        },
        'aggs': get_count_aggs()
      }
    }
  }

def get_last_sync_query(bucket_end_ts):
  return {
    'size': 1,
    'query': {
      'bool': {
        'filter': [
          { 'range': { list_tracker_ts.field: {
            'lt': bucket_end_ts
          }}},
          { 'term': { list_tracker_activity.field: {
            'value': SYNCHRONIZE_ACTIVITY
          }}}
        ]
      }
    }
  }

def get_single_bucket_query(from_ts, to_ts):
  return {
    'size': 0,
    'query': {
      'bool': {
        'filter': {
          'range': {
            list_tracker_ts.field: { 'gt': from_ts, 'lt': to_ts }
          }
        }
      }
    },
    'aggs': get_count_aggs()
  }

if last_output_ts is not None:
  # Last calculated aggregation has to be redone, because new data points may have been added to it
  list_subs.es_delete_by_query({
    'query': {
      'match': { list_subs_ts.field: last_output_ts }
    }
  })

list_tracker_response = list_tracker.es_search(get_list_subs_query())

cached_last_values = {
  status: ( state.get(status) or 0 ) for status in SUBSCRIPTION_STATUS
}

for hit in list_tracker_response['aggregations']['values_by_time_interval']['buckets']:
  last_output_ts = hit['key_as_string']
  bucket_end_ts = get_bucket_end_ts(last_output_ts)

  doc = {
    list_subs_ts.field: bucket_end_ts
  }

  updated = False

  if hit['sync']['doc_count'] > 0:
    log('synchronizing near ' + last_output_ts)
    updated = True
    res = list_tracker.es_search(get_last_sync_query(bucket_end_ts))
    sync_hit = res['hits']['hits'][0]
    ts = sync_hit['_source'][list_tracker_ts.field]
    sub_count = sync_hit['_source'][list_tracker_sub_count.field]
    res = list_tracker.es_search(get_single_bucket_query(ts, bucket_end_ts))
    # sync cached subs, overwrite the hit variable and continue processing
    cached_last_values['subscribed'] = sub_count
    hit = res['aggregations']

  for status in SUBSCRIPTION_STATUS:
    last_value = cached_last_values[status]

    field = list_subs.get_signal(status).field

    new_subs = hit[status]['doc_count']
    prev_subs = hit[f'prev_{status}']['doc_count']
    next_value = last_value + new_subs - prev_subs
    doc[field] = next_value

    if next_value != last_value: updated = True

    # we need to store the second to last value as the last entry will be re-inserted later
    state[status] = last_value
    cached_last_values[status] = next_value

  if updated:
    # difference of id and timestamp may not be optimal but is not an error, as entries from the last id need to be searched
    list_subs.es_index_doc(last_output_ts, doc)

state['last_output_ts'] = last_output_ts
ivis.store_state(state)
