# План за: Добави Stripe плащане в eshop-basic

1. Инсталирай Stripe:
```bash
npm install stripe
```

Добави в .env:
```.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

2. Backend – създай routes/payment.js:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: 'bgn',
    automatic_payment_methods: { enabled: true },
  });
  res.json({ clientSecret: paymentIntent.client_secret });
});
```

3. Frontend – добави Stripe Elements в checkout страницата:
```html
<script src="https://js.stripe.com/v3/"></script>
```
```javascript
const stripe = Stripe('pk_test_...');
const elements = stripe.elements();
const card = elements.create('card');
card.mount('#card-element');
```

4. Webhook – routes/webhook.js за потвърждение:
```javascript
router.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  if (event.type === 'payment_intent.succeeded') {
    // обнови поръчката в базата
  }
});
```

5. Тествай с тестова карта 4242 4242 4242 4242