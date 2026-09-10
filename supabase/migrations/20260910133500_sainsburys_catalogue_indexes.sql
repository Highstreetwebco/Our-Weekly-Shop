-- Cover foreign keys used by catalogue cache maintenance and cleanup.
create index if not exists catalogue_import_events_retailer_idx
  on public.catalogue_import_events (retailer_id);

create index if not exists catalogue_search_products_product_idx
  on public.catalogue_search_products (product_id);

create index if not exists catalogue_searches_requester_idx
  on public.catalogue_searches (last_requested_by)
  where last_requested_by is not null;

