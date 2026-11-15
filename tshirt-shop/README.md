# Tee Shop

A small t-shirt store with an admin back end.

## Run

```bash
npm install
ADMIN_PASSWORD=your-password npm start
```

- Shop: http://localhost:3000
- Admin: http://localhost:3000/admin/

## Admin can
- Add, edit, delete products (name, price, description, colour, photo upload)
- Set stock per size (XS–XXL); sold-out sizes can't be bought
- Hide/show products without deleting them
- See orders and set status (new / paid / shipped / cancelled)

## Notes
- Data is stored in `data/db.json`, uploaded photos in `uploads/` (both git-ignored). Seeded with 3 sample shirts on first run.
- Checkout is a demo: it records the order and reduces stock, but takes **no payment**. Hook up Stripe Checkout before selling for real.
- Set `SESSION_SECRET` too if you want admin logins to survive a server restart.
