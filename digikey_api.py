import os
from pathlib import Path

import digikey
from digikey.v3.productinformation import KeywordSearchRequest
from digikey.v3.batchproductdetails import BatchProductDetailsRequest

CACHE_DIR = Path('path/to/cache/dir')

os.environ['DIGIKEY_CLIENT_ID'] = 'client_id'
os.environ['DIGIKEY_CLIENT_SECRET'] = 'client_secret'
os.environ['DIGIKEY_CLIENT_SANDBOX'] = 'False'
os.environ['DIGIKEY_STORAGE_PATH'] = CACHE_DIR

# Query product number
dkpn = '296-6501-1-ND'
part = digikey.product_details(dkpn)

# Search for parts
search_request = KeywordSearchRequest(keywords='motor', record_count=10)
result = digikey.keyword_search(body=search_request)

# Only if BatchProductDetails endpoint is explicitly enabled
# Search for Batch of Parts/Product
mpn_list = ["0ZCK0050FF2E", "LR1F1K0"] #Length upto 50
batch_request = BatchProductDetailsRequest(products=mpn_list)
part_results = digikey.batch_product_details(body=batch_request)
