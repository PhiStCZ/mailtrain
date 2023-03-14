from datetime import datetime, timedelta
from ivis import ivis

'''
Aggregates and accumulates subscription counts from a given list tracker.
It *might* support even other types of subscribed states, but those are used
more by the system rather than by the users, and would require additional
logging (e.g. in /server/services/gdpr-cleanup) for little benefit.
'''

#region HELPER_FUNCTIONS_AND_VARS

es = ivis.elasticsearch
state = ivis.state or {}
params = ivis.params
entities = ivis.entities
owned = ivis.owned


def parse_date(iso_date):
  # elasticsearch returns UTC iso format to a millisecond range, ended by 'Z'
  parseable_date = iso_date[:-1] + '000' # add microseconds
  return datetime.strptime(parseable_date, '%Y-%m-%dT%H:%M:%S.%f')

def get_signal_set(sigset_cid):
  return entities['signalSets'][sigset_cid]

def get_signal(sigset_cid, signal_cid):
  return entities['signals'][sigset_cid][signal_cid]

#endregion


SUBSCRIPTION_STATUS = {
  'subscribed': 1,
  # 'unsubscribed': 2,
  # 'bounced': 3,
  # 'complained': 4,
}
TIMESTAMP_CID = 'timestamp'

# bucket size interval
INTERVAL = '60s'
INTERVAL_MILLIS = 60_000

list_id = params['listId']
creation_timestamp = params['creationTimestamp']
list_tracker_cid = params['listTracker']
list_subs_cid = params['listSubscriptionsCid']

last_output_ts = state.get('last_output_ts')

list_tracker = get_signal_set(list_tracker_cid)
list_tracker_ts = get_signal(list_tracker_cid, TIMESTAMP_CID)
list_tracker_status = get_signal(list_tracker_cid, 'subscriptionStatus')
list_tracker_prev_status = get_signal(list_tracker_cid, 'previousSubscriptionStatus')

target_namespace = list_tracker['namespace']


def insert_zeros_record(timestamp):
  doc = { get_signal(list_subs_cid, TIMESTAMP_CID)['field']: timestamp }

  for status in SUBSCRIPTION_STATUS:
    doc[get_signal(list_subs_cid, status)['field']] = 0

  es.index(index=get_signal_set(list_subs_cid)['index'], id=timestamp, doc_type='_doc', body=doc)

def create_list_subs_with_first_entry():
  i = 0
  signals = [{
    'cid': TIMESTAMP_CID,
    'name': 'Timestamp',
    'namespace': target_namespace,
    'type': 'date',
    'indexed': True,
    'weight_list': i,
    'weight_edit': i,
  }]

  for status in SUBSCRIPTION_STATUS:
    i += 1
    signals.append({
      'cid': status,
      'name': f'{status} subscriptions',
      'description': f'Number of {status} subscriptions',
      'namespace': target_namespace,
      'type': 'integer',
      'indexed': False,
      'weight_list': i,
      'weight_edit': i,
    })

  ivis.create_signal_set(
    list_subs_cid,
    target_namespace,
    f'List {list_id} subscriptions',
    f'Subscription counts for list {list_id}',
    None,
    signals)

  insert_zeros_record(creation_timestamp)


if owned['signalSets'].get(list_subs_cid) is None:
  create_list_subs_with_first_entry()
  exit(0)


list_subs = get_signal_set(list_subs_cid)
list_subs_ts = get_signal(list_subs_cid, TIMESTAMP_CID)


def get_count_aggs():
  count_aggs = {}
  for status in SUBSCRIPTION_STATUS:
    count_aggs[status] = {
      'filter': {
        'term': {
          list_tracker_status['field']: {
            'value': SUBSCRIPTION_STATUS[status]
          }
        }
      }
    }
    count_aggs[f'prev_{status}'] = {
      'filter': {
        'term': {
          list_tracker_prev_status['field']: {
            'value': SUBSCRIPTION_STATUS[status]
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
            list_tracker_ts['field']: { 'gte': last_output_ts }
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
          'field': list_tracker_ts['field'],
          # on update to newer elasticsearch, update to fixed_interval
          'interval': INTERVAL
        },
        'aggs': get_count_aggs()
      }
    }
  }


if last_output_ts is not None:
  # Last calculated aggregation has to be redone, because new data points may have been added to it
  es.delete_by_query(index=list_subs['index'], body={
    'query': {
      'match': { list_subs_ts['field']: last_output_ts }
    }
  })

list_tracker_response = es.search(index=list_tracker['index'], body=get_list_subs_query())

cached_last_values = {
  status: ( state.get(status) or 0 ) for status in SUBSCRIPTION_STATUS
}

for hit in list_tracker_response['aggregations']['values_by_time_interval']['buckets']:
  last_output_ts = hit['key_as_string']

  last_timestamp_time = parse_date(last_output_ts)
  next_timestamp_time = last_timestamp_time + timedelta(milliseconds=INTERVAL_MILLIS)
  next_timestamp = next_timestamp_time.isoformat()

  doc = {
    list_subs_ts['field']: next_timestamp
  }

  updated = False
  for status in SUBSCRIPTION_STATUS:
    last_value = cached_last_values[status]

    status_field = get_signal(list_subs_cid, status)['field']

    new_subs = hit[status]['doc_count']
    prev_subs = hit[f'prev_{status}']['doc_count']
    next_value = last_value + new_subs - prev_subs
    doc[status_field] = next_value

    if next_value != last_value: updated = True

    # we need to store the second to last value as the last entry will be re-inserted later
    state[status] = last_value
    cached_last_values[status] = next_value

  if updated:
    # difference of id and timestamp may not be optimal but is not an error, as entries from the last id need to be searched
    es.index(index=list_subs['index'], id=last_output_ts, doc_type='_doc', body=doc)

state['last_output_ts'] = last_output_ts
ivis.store_state(state)
