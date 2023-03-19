from datetime import datetime, timedelta
from ivis import ivis

'''
Aggregates and accumulates different activity type counts from a given campaign tracker.
Relevant activity types are (sent, failed, bounced, opened, unsubscribed, complained).
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


ACTIVITY_TYPE = {
  'sent': 1,
  # 'test_sent': 2,
  'bounced': 3,
  'unsubscribed': 4,
  'complained': 5,
  'opened': 6,
  # 'clicked': 7,
  # 'triggered': 8,
  'failed': 9,
  'clicked_any': 10,
  # 'add_link': 11,
}
ACTIVITY_CLICKED = 7
ACTIVITY_ADD_LINK = 11

TIMESTAMP_CID = 'timestamp'
ACTIVITY_TYPE_CID = 'activityType'
LINK_ID_CID = 'linkId'

# bucket size interval
INTERVAL = '60s'
INTERVAL_MILLIS = 60_000

campaign_id = params['campaignId']
creation_timestamp = params['creationTimestamp']
campaign_tracker_cid = params['campaignTracker']
campaign_msgs_cid = params['campaignMessagesCid']

state.setdefault('links', {})
last_bucket_ts = state.get('last_output_ts')

campaign_tracker = get_signal_set(campaign_tracker_cid)
campaign_tracker_ts = campaign_tracker.get_signal(TIMESTAMP_CID)
campaign_tracker_activity = campaign_tracker.get_signal(ACTIVITY_TYPE_CID)
campaign_tracker_link_id = campaign_tracker.get_signal(LINK_ID_CID)
target_namespace = campaign_tracker.namespace

def get_link_key(link_id):
  return f'link_{link_id}'

def get_bucket_record_id(bucket_start_timestamp):
  return bucket_start_timestamp

def get_bucket_end_ts(bucket_start_timestamp):
  b_end = parse_date(bucket_start_timestamp)
  b_end += timedelta(milliseconds=INTERVAL_MILLIS)
  return b_end.isoformat()

def insert_zeros_record(timestamp):
  campaign_msgs = get_signal_set(campaign_msgs_cid)

  doc = { campaign_msgs.get_signal(TIMESTAMP_CID).field: timestamp }
  for event_type in ACTIVITY_TYPE:
    doc[campaign_msgs.get_signal(event_type).field] = 0
  for link_id in state['links']:
    doc[campaign_msgs.get_signal(get_link_key(link_id)).field] = 0

  campaign_msgs.es_index_doc(timestamp, doc)

def get_count_signal_spec(cid, name, description, weight):
  return {
    'cid': cid,
    'name': name,
    'description': description,
    'weight_list': weight,
    'weight_edit': weight,
    'namespace': target_namespace,
    'type': 'integer',
    'indexed': False,
  }

def create_campaign_messages_with_first_entry():
  signals = [{
    'cid': TIMESTAMP_CID,
    'name': 'Timestamp',
    'namespace': target_namespace,
    'type': 'date',
    'indexed': True,
    'weight_list': 0,
    'weight_edit': 0,
  }]

  for i, event_type in enumerate(ACTIVITY_TYPE):
    signals.append(get_count_signal_spec(
      event_type,
      f'{event_type} messages',
      f'Number of {event_type} messages',
      i + 1
    ))

  ivis.create_signal_set(
    campaign_msgs_cid,
    target_namespace,
    f'Campaign {campaign_id} messages',
    f'message activity for campaign {campaign_id}',
    None,
    signals)

  insert_zeros_record(creation_timestamp)

def update_links():
  new_link_ids = []
  QUERY_SIZE = 100
  req_body = {
    'from': 0,
    'size': QUERY_SIZE,
    'query': { 'bool': { 'filter': [
      { 'term': { campaign_tracker_activity.field: ACTIVITY_ADD_LINK }},
      { 'range': { campaign_tracker_ts.field: { 'gte': creation_timestamp }}}
    ]}},
    'sort': [
      { campaign_tracker_ts.field: { 'order': 'asc' }}
    ]
  }

  finished = False
  while not finished:
    res = campaign_tracker.es_search(req_body)
    hits = res['hits']['hits']

    for hit in hits:
      link_id = hit['_source'][campaign_tracker_link_id.field]
      if state['links'].get(get_link_key(link_id)) is None:
        state['links'][link_id] = 0
        new_link_ids.append(link_id)

    if len(hits) < QUERY_SIZE: finished = True
    req_body['from'] += QUERY_SIZE

  if len(new_link_ids) == 0: return new_link_ids

  ivis.create_signals(signals={
    campaign_msgs_cid: [
      get_count_signal_spec(
        get_link_key(link_id),
        f'Link {link_id} clicks',
        f'Number of clicks of link {link_id}',
        10 # for now just some large weight, the order of links doesn't really matter
      ) for link_id in new_link_ids
    ]
  })

  return new_link_ids

def get_campaign_tracker_query():
  query_content = { 'bool': { 'filter': { 'range': {
    campaign_tracker_ts.field: { 'gte': last_bucket_ts }
  }}}}

  count_aggregations = {
    event_type: { 'filter': { 'term': {
      campaign_tracker_activity.field: {
        'value': ACTIVITY_TYPE[event_type]
      }
    }}} for event_type in ACTIVITY_TYPE
  }

  count_aggregations['links'] = {
    'filter': { 'term': {
      campaign_tracker_activity.field: ACTIVITY_CLICKED
    }},
    'aggs': {
      get_link_key(link_id): { 'filter': { 'term': {
        campaign_tracker_link_id.field: link_id
      }}} for link_id in state['links']
    }
  }

  # query meaning: for buckets of given intervals { for each relevant value { return their count } }
  return {
    'size': 0,
    'query': query_content,
    'aggs': {
      'values_by_time_interval': {
        'date_histogram': {
          'field': campaign_tracker_ts.field,
          # on update to newer elasticsearch, update to fixed_interval
          'interval': INTERVAL
        },
        'aggs': count_aggregations
      }
    }
  }


if owned['signalSets'].get(campaign_msgs_cid) is None:
  create_campaign_messages_with_first_entry()
  state['first_init'] = True
  ivis.store_state(state)
  log('Signal set initialisation complete.')
  exit(0)

if state.get('first_init') == True:
  state['first_init'] = False
  update_links()

# now the campaign messages should be created and present
campaign_msgs = get_signal_set(campaign_msgs_cid)
campaign_msgs_ts = campaign_msgs.get_signal(TIMESTAMP_CID) 


if last_bucket_ts is not None:
  # Last calculated aggregation has to be redone, because new data points may have been added to it
  campaign_msgs.es_delete_by_query({ 'query': { 'term': {
    campaign_msgs_ts.field: get_bucket_record_id(last_bucket_ts)
  }}})
else:
  last_bucket_ts = creation_timestamp

cached_last_values = {
  event_type: ( state.get(event_type) or 0 ) for event_type in ACTIVITY_TYPE
}
cached_last_link_values = {
  link_id: state['links'][link_id] for link_id in state['links']
}

finished = False
while not finished:
  campaign_tracker_res = campaign_tracker.es_search(get_campaign_tracker_query())
  finished = True

  for hit in campaign_tracker_res['aggregations']['values_by_time_interval']['buckets']:
    last_bucket_ts = hit['key_as_string']

    total_links = hit['links']['doc_count']
    for link_id in state['links']:
      total_links -= hit['links'][get_link_key(link_id)]['doc_count']
    if total_links != 0:
      log('Found new links; updating...')
      for new_link_id in update_links():
        cached_last_link_values[new_link_id] = 0
      finished = False
      break

    doc = { campaign_msgs_ts.field: get_bucket_end_ts(last_bucket_ts) }

    updated = False

    for event_type in ACTIVITY_TYPE:
      last_value = cached_last_values[event_type]

      field = campaign_msgs.get_signal(event_type).field
      new_activity = hit[event_type]['doc_count']
      doc[field] = last_value + new_activity
      if new_activity != 0: updated = True

      # we need to store the second to last value as the last entry will be re-aggregated later
      state[event_type] = last_value
      cached_last_values[event_type] = doc[field]

    for link_id in state['links']:
      link_key = get_link_key(link_id)
      last_value = cached_last_link_values[link_id]

      field = campaign_msgs.get_signal(link_key).field
      new_clicks = hit['links'][link_key]['doc_count']
      doc[field] = last_value + new_clicks
      if new_clicks != 0: updated = True

      state['links'][link_id] = last_value
      cached_last_link_values[link_id] = doc[field]

    if updated:
      campaign_msgs.es_index_doc(get_bucket_record_id(last_bucket_ts), doc)

state['last_output_ts'] = last_bucket_ts
ivis.store_state(state)
