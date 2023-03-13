from datetime import datetime, timedelta
from ivis import ivis

'''
Aggregates and accumulates different activity type counts from a given campaign tracker.
Relevant activity types are (sent, failed, bounced, opened, unsubscribed, complained).
'''

CAMPAIGN_TRACKER_ACTIVITY_TYPE = {
  'sent': 1,
  'test-sent': 2,
  'bounced': 3,
  'unsubscribed': 4,
  'complained': 5,
  'opened': 6,
  'clicked': 7,
  'triggered': 8,
  'failed': 9
}
RELEVANT_EVENTS = [ 'sent', 'failed', 'bounced', 'opened', 'unsubscribed', 'complained' ]
TIMESTAMP_CID = 'timestamp'
CAMPAIGN_ACTIVITY_RESET_ID = 5
CAMPAIGN_QUERY_SIZE = 100
INTERVAL = '60s' # bucket size interval
INTERVAL_MILLIS = 60_000

es = ivis.elasticsearch
state = ivis.state
params = ivis.params
entities = ivis.entities
owned = ivis.owned

campaign_id = params['campaignId']
creation_timestamp = params['creationTimestamp']
campaign_tracker_cid = params['campaignTracker']
campaign_cid = params['campaign']
campaign_messages_cid = params['campaignMessagesCid']


def parse_date(iso_date):
  # elasticsearch returns UTC iso format to a millisecond range, ended by 'Z'
  parseable_date = iso_date[:-1] + '000' # add microseconds
  return datetime.strptime(parseable_date, '%Y-%m-%dT%H:%M:%S.%f')

def get_signal_set(sigset_cid):
  return entities['signalSets'][sigset_cid]

def get_signal(sigset_cid, signal_cid):
  return entities['signals'][sigset_cid][signal_cid]


campaign_tracker = get_signal_set(campaign_tracker_cid)
campaign_tracker_timestamp = get_signal(campaign_tracker_cid, TIMESTAMP_CID)
campaign_tracker_activity_type = get_signal(campaign_tracker_cid, 'activityType')

campaign_namespace = campaign_tracker['namespace']

campaign = get_signal_set(campaign_cid)
campaign_timestamp = get_signal(campaign_cid, TIMESTAMP_CID)
campaign_activity_signal = get_signal(campaign_cid, 'activityType')
campaign_id_signal = get_signal(campaign_cid, 'entityId')


def insert_zeros_record(timestamp):
  doc = { get_signal(campaign_messages_cid, TIMESTAMP_CID)['field']: timestamp }

  for event_type in RELEVANT_EVENTS:
    doc[get_signal(campaign_messages_cid, event_type)['field']] = 0

  es.index(index=get_signal_set(campaign_messages_cid)['index'], id=timestamp, doc_type='_doc', body=doc)

def create_campaign_messages_with_first_entry():
  i = 0
  transformed_signals = [{
    'cid': TIMESTAMP_CID,
    'name': 'Timestamp',
    'namespace': campaign_namespace,
    'type': 'date',
    'indexed': True,
    'weight_list': i,
    'weight_edit': i,
  }]

  for event_type in RELEVANT_EVENTS:
    i += 1
    transformed_signals.append({
      'cid': event_type,
      'name': f'{event_type} messages',
      'description': f'Number of {event_type} messages',
      'namespace': campaign_namespace,
      'type': 'integer',
      'indexed': False,
      'weight_list': i,
      'weight_edit': i,
    })

  ivis.create_signal_set(
    campaign_messages_cid,
    campaign_namespace,
    f'Campaign messages {campaign_id}',
    f'message activity for campaign {campaign_id}',
    None,
    transformed_signals)

  insert_zeros_record(creation_timestamp)

if owned['signalSets'].get(campaign_messages_cid) is None:
  create_campaign_messages_with_first_entry()
  exit(0)

# now the campaign messages should be created and present
campaign_messages = get_signal_set(campaign_messages_cid)
campaign_messages_timestamp = get_signal(campaign_messages_cid, TIMESTAMP_CID)


def get_campaign_tracker_count_aggregations():
  count_aggs = {}
  for event_type in RELEVANT_EVENTS:
    count_aggs[event_type] = {
      'filter': {
        'term': {
          campaign_tracker_activity_type['field']: {
            'value': CAMPAIGN_TRACKER_ACTIVITY_TYPE[event_type]
          }
        }
      },
    }
  return count_aggs

def get_campaign_tracker_query():
  last_timestamp = state.get('last_output_ts')
  if last_timestamp is not None:
    query_content = {
      'bool': {
        'filter': {
          'range': {
            campaign_tracker_timestamp['field']: { 'gte': last_timestamp }
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
          'field': campaign_tracker_timestamp['field'],
          # on update to newer elasticsearch, update to fixed_interval
          'interval': INTERVAL
        },
        'aggs': get_campaign_tracker_count_aggregations()
      }
    }
  }

def get_campaign_tracker_query_after_reset(from_time, to_time):
  query_content = {
    'bool': {
      'filter': {
        'range': {
          campaign_tracker_timestamp['field']: {
            'gte': from_time,
            'lt': to_time
          }
        }
      }
    }
  }

  return {
    'size': 0,
    'query': query_content,
    'aggs': get_campaign_tracker_count_aggregations()
  }

def get_campaign_query(page_num):
  last_timestamp = state.get('last_output_ts')
  query_content = {
    'bool': {
      'filter': [
        {
          'term': { campaign_activity_signal['field']: CAMPAIGN_ACTIVITY_RESET_ID }
        },
        {
          'term': { campaign_id_signal['field']: campaign_id }
        }
      ]
    }
  }

  if last_timestamp is not None:
    query_content['bool']['filter'].append({
      'range': {
        campaign_timestamp['field']: { 'gte': last_timestamp }
      }
    })

  return {
    'from': 100 * page_num,
    'size': 100,
    'query': query_content,
    'sort': [ { campaign_timestamp['field']: 'asc' } ]
  }


if state is None: state = {}

last_timestamp = state.get('last_output_ts')
if last_timestamp is not None:
  to_delete_time = parse_date(last_timestamp) + timedelta(milliseconds=INTERVAL_MILLIS)
  # Last calculated aggregation has to be redone, because new data points may have been added to it
  es.delete_by_query(index=campaign_messages['index'], body={
    'query': {
      'match': {
        campaign_messages_timestamp['field']: to_delete_time.isoformat()
      }
    }
  })

campaign_tracker_response = es.search(index=campaign_tracker['index'], body=get_campaign_tracker_query())

reset_dates = {
  'hits': None,
  'idx': None,
  'page': 0
}


def get_next_reset_date(resets):
  hits = resets['hits']
  idx = resets['idx']

  if idx is None or idx == len(hits):
    if idx is not None and len(hits) < CAMPAIGN_QUERY_SIZE:
      resets['hit'] = None
      return None
    res = es.search(index=campaign['index'], body=get_campaign_query(resets['page']))
    hits = res['hits']['hits']
    resets['hits'] = hits
    resets['page'] += 1
    idx = 0
  
  if idx == len(hits):
    resets['hit'] = None
    return None

  hit_date = hits[idx]['_source'][campaign_timestamp['field']]
  resets['hit'] = hit_date
  resets['idx'] = idx + 1
  return hit_date

def get_last_reset_in_ts_range(resets, after, before):
  last_reset = resets['hit']
  if last_reset is None:
    return None
  if parse_date(last_reset) >= before:
    return None

  next_reset = get_next_reset_date(resets)
  while next_reset is not None and parse_date(next_reset) < before:
    last_reset = next_reset
    next_reset = get_next_reset_date(resets)

  if parse_date(last_reset) < after:
    return None

  return last_reset


cached_last_values = {
  event_type: (
    state.get(event_type) or 0
  ) for event_type in RELEVANT_EVENTS
}

get_next_reset_date(reset_dates)

for hit in campaign_tracker_response['aggregations']['values_by_time_interval']['buckets']:
  last_timestamp = hit['key_as_string']

  last_timestamp_time = parse_date(last_timestamp)
  next_timestamp_time = last_timestamp_time + timedelta(milliseconds=INTERVAL_MILLIS)
  next_timestamp = next_timestamp_time.isoformat()
  target_reset_timestamp = get_last_reset_in_ts_range(reset_dates, last_timestamp_time, next_timestamp_time)

  doc = {
    campaign_messages_timestamp['field']: next_timestamp
  }

  if target_reset_timestamp is not None:
    from_time = parse_date(target_reset_timestamp).isoformat()
    query = get_campaign_tracker_query_after_reset(from_time, next_timestamp)
    after_reset_res = es.search(index=campaign_tracker['index'], body=query)
    after_reset_hits = after_reset_res['aggregations']
    insert_zeros_record(target_reset_timestamp)

  updated = (target_reset_timestamp is not None)
  for event_type in RELEVANT_EVENTS:
    last_value = cached_last_values[event_type] or 0


    event_type_field = get_signal(campaign_messages_cid, event_type)['field']
    if target_reset_timestamp is not None:
      after_reset_message_activity = after_reset_hits[event_type]['doc_count']
      doc[event_type_field] = after_reset_message_activity
    else:
      message_activity = hit[event_type]['doc_count']
      doc[event_type_field] = last_value + message_activity

      if message_activity > 0: updated = True

    # we need to store the second to last value as the last entry will be re-aggregated later
    state[event_type] = last_value
    cached_last_values[event_type] = doc[event_type_field]

  # don't add an entry if it has not added anything
  if updated:
    # difference of id and timestamp may not be optimal but is not an error, as entries from the last id need to be searched
    es.index(index=campaign_messages['index'], id=next_timestamp, doc_type='_doc', body=doc)

state['last_output_ts'] = last_timestamp
ivis.store_state(state)
