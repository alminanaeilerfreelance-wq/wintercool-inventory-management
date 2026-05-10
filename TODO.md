# TODO

- [ ] Update Locations UI (frontend/pages/master/locations.js): remove Rack column and Rack field from Add/Edit form; update formData and submit payload.
- [ ] Update Locations backend (backend/routes/locations.js) so Rack association is removed on update/create and never populated from omitted rackId (since UI will not send rackId anymore).
- [ ] Run frontend/backend tests/build (at least lint + start) and verify Add/Edit/Delete works for Locations.

