## E-Commerce Backend Documentation
Here's a list of all the URL Paths you can use with this backend and what each URL Path does.

**Authentication**
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `POST /api/auth/logout`

**Admin Order Management**
- `GET /api/admin/orders`
- `PUT /api/admin/orders/:orderId/status`

**Products, Delivery Options**
- [GET /api/products](#get-apiproducts)
- `GET /api/products/categories`
- `GET /api/products/:productId`
- [GET /api/delivery-options](#get-apidelivery-options)

**Cart**
- [GET /api/cart-items](#get-apicart-items)
- [POST /api/cart-items](#post-apicart-items)
- [PUT /api/cart-items/:productId](#put-apicart-itemsproductid)
- [DELETE /api/cart-items/:productId](#delete-apicart-itemsproductid)

**Orders**
- [GET /api/orders](#get-apiorders)
- [POST /api/orders](#post-apiorders)
- [GET /api/orders/:orderId](#get-apiordersorderid)

**Payment Summary, Reset**
- [GET /api/payment-summary](#get-apipayment-summary)
- [POST /api/reset](#post-apireset)

Cart, order, and payment-summary endpoints require a logged-in user. Send the session
token returned by signup or login as `Authorization: Bearer <token>`. Products and
delivery options remain publicly available.
Admin order endpoints require a logged-in account with the `admin` role.

## Admin Setup
1. Create a normal account through the storefront.
2. Stop the backend before promoting the account to avoid concurrent SQLite access.
3. From the backend directory, run `npm run admin:promote -- admin@example.com`.
4. Restart the backend and sign in again to refresh the account role in the session.

To create or reset an admin account password, set `ADMIN_PASSWORD` in the shell and run
`npm run admin:setup -- admin@example.com`. Add `--replace-existing` to demote other admin
accounts and revoke their sessions. Clear the environment variable after the command finishes.

New signups always receive the `customer` role. Roles cannot be set through the signup or
profile APIs.

## POST /api/auth/signup
Creates an account and starts a session.

**Request:**
```js
{ "name": "Name", "email": "name@example.com", "password": "at-least-8-characters" }
```

Returns `{ "token": "string", "user": { "id": "uuid", "name": "string", "email": "string", "role": "customer" } }`.
New accounts always receive the `customer` role. Passwords are stored as salted hashes.

## POST /api/auth/login
Checks the email and password and returns a session token and user.

**Request:**
```js
{ "email": "name@example.com", "password": "your-password" }
```

## GET /api/auth/me
Returns the current user's name, email, role, phone, and address. Requires the bearer token.

## PUT /api/auth/profile
Updates the signed-in user's name, email, phone number, and delivery address. These details
are saved to the profile and copied onto each order when it is placed.

**Request:**
```js
{
  "name": "Name",
  "email": "name@example.com",
  "phone": "+1 555 123 4567",
  "address": "Street, city, postal code"
}
```

## POST /api/auth/logout
Ends the current session. Requires the bearer token.

## Admin order workflow
Admins can review all customer orders. Pending orders can be confirmed (`pending` -> `packed`)
or rejected/cancelled (`pending` -> `cancelled`). Confirmed orders continue through
`packed` -> `shipped` -> `delivered`. Updates cannot be skipped, cancelled after packing, or
moved backward.

## GET /api/admin/orders
Returns all customer orders, newest first, including customer contact details and product names.
Requires a logged-in admin account.

## PUT /api/admin/orders/:orderId/status
Advances one order to its next business status. Requires a logged-in admin account.

**Request:**
```js
{ "status": "packed | shipped | delivered | cancelled" }
```

Only the next status in the workflow is accepted; `cancelled` is only allowed from `pending`.
A stale concurrent update returns `409`.
  
## GET /api/products
Returns a list of products.

**Query Parameters:**
- `search=...` (optional): Search product names, keywords, or categories
- `category=...` (optional): Return products in the selected category

**Response:**
```js
[
  {
    "id": "uuid",
    "image": "string",
    "name": "string",
    "category": "string",
    "rating": {
      "stars": "number",
      "count": "number"
    },
    "priceCents": "number",
    "keywords": ["string"]
  }
]
```

## GET /api/products/categories
Returns all product categories as a sorted list of strings.

## GET /api/products/:productId
Returns one product, including its category. Returns `404` when the product does not exist.

## GET /api/delivery-options
Returns a list of all delivery options.

**Query Parameters:**
- `expand=estimatedDeliveryTime` (optional): includes estimated delivery times

**Response:**
```js
[
  {
    "id": "string",
    "deliveryDays": "number",
    "priceCents": "number",
    // Only included when expand=estimatedDeliveryTime
    "estimatedDeliveryTimeMs": "number"
  }
]
```

## GET /api/cart-items
Returns all items in the cart.

**Query Parameters:**
- `expand=product` (optional): include full product details

**Response:**
```js
[
  {
    "productId": "uuid",
    "quantity": "number",
    "deliveryOptionId": "string",
    "selected": "boolean",
      // product object, only when expand=product
    "product": "object"
  }
]
```

## POST /api/cart-items
Adds a product to the cart.

**Request:**
```js
{
  "productId": "uuid",
  // Must be between 1 and 10
  "quantity": "number"
}
```
- Cart items start unselected. The user must select items before checkout.

**Response:**
```js
{
  "productId": "uuid",
  "quantity": "number",
  "deliveryOptionId": "string",
  "selected": "boolean",
}
```

## PUT /api/cart-items/:productId
Updates a cart item.

**URL Parameters:**
- `productId`: ID of the product to update

**Request:**
```js
{
   // Optional, must be ≥ 1
  "quantity": "number",
  
  // Optional
  "deliveryOptionId": "string"

  // Optional
  "selected": "boolean"
}
```

**Response:**
```js
{
  "productId": "uuid",
  "quantity": "number",
  "deliveryOptionId": "string",
}
```

## DELETE /api/cart-items/:productId
Removes an item from the cart.

**URL Parameters:**
- `productId`: ID of the product to remove

**Response:**
- Status: 204 (No response)

## GET /api/orders
Returns all orders, sorted by most recent first.

**Query Parameters:**
- `expand=products` (optional): include full product details

**Response:**
```js
[
  {
    "id": "uuid",
    "status": "pending | packed | shipped | delivered | cancelled",
    "paymentMethod": "cash_on_hand",
    "customerName": "string",
    "customerEmail": "string",
    "customerPhone": "string",
    "shippingAddress": "string",
    "orderTimeMs": "number",
    "totalCostCents": "number",
    "products": [
      {
        "productId": "uuid",
        "quantity": "number",
        "estimatedDeliveryTimeMs": "number",
         // product object, only when expand=products
        "product": "object"
      }
    ]
  }
]
```

## POST /api/orders
Creates a new order from the current cart items.
Only selected cart items are included. The buyer must have a saved phone number and
delivery address. The order stores a snapshot of the buyer's contact details.

**Request:**
```js
{ "paymentMethod": "cash_on_hand" }
```

**Response:**
```js
{
  "id": "uuid",
  "status": "pending | packed | shipped | delivered | cancelled",
  "paymentMethod": "cash_on_hand",
  "customerName": "string",
  "customerEmail": "string",
  "customerPhone": "string",
  "shippingAddress": "string",
  "orderTimeMs": "number",
  "totalCostCents": "number",
  "products": [
    {
      "productId": "uuid",
      "quantity": "number",
      "estimatedDeliveryTimeMs": "number",
    }
  ]
}
```
- Side effect: Selected cart items are removed; unselected items remain in the cart.
- New orders start with status `pending`.
- Payment method is `cash_on_hand`.

## GET /api/orders/:orderId
Returns a specific order.

**URL Parameters:**
- `orderId`: ID of the order

**Query Parameters:**
- `expand=products` (optional): include full product details

**Response:**
```js
{
  "id": "uuid",
  "orderTimeMs": "number",
  "totalCostCents": "number",
  "products": [
    {
      "productId": "uuid",
      "quantity": "number",
      "estimatedDeliveryTimeMs": "number",
        // product object, only when expand=products
      "product": "object"
    }
  ]
}
```

## GET /api/payment-summary
Calculates and returns the payment summary for selected cart items only.

**Response:**
```js
{
  "totalItems": "number",
  "productCostCents": "number",
  "shippingCostCents": "number",
  "totalCostBeforeTaxCents": "number",
  "taxCents": "number",
  "totalCostCents": "number"
}
```

## POST /api/reset
Resets the database to its default state.

**Response:**
- Status: 204 No Response
