const htmlFragment = (tier, amount) => `
<div class="col">
<div class="card mb-4 rounded-3 shadow-sm">
  <div class="card-header py-3">
    <h4 class="my-0 fw-normal">${tier}</h4>
  </div>
  <div class="card-body">
    <h1 class="card-title pricing-card-title">
      ${amount}<small class="text-muted fw-light">/mo</small>
    </h1>

    <button
      type="button"
      id=${tier}
      class="w-100 btn btn-lg btn-outline-primary checkout"
    >
      Get Started
    </button>
  </div>
</div>
</div>
`;

let config = {}
bootstrap()
.then(config => {
  config = config
  const stripe = Stripe(config.pub_key);
  handlers(stripe)
})

async function bootstrap() {
  try {
    const response = await fetch('/config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const config = await response.json()
    insertFragments(config)
    return config;
  } catch (error) {
    console.error('Error:', error);
  }
}

function insertFragments(config) {
  const tiers = Object.keys(config.pricing)
  for (const tier of tiers) {
    $('#pricing_container').append(htmlFragment(tier, 10))
  }
}

function handlers(stripe) {
  const button = $('.checkout');
  button.on('click', function (e) {
  e.preventDefault();
    fetch('/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quantity: 1,
        price_id: $(e).prop('id')
      }),
    })
    .then((response) => response.json())
    .then((session) => {
      stripe.redirectToCheckout({ sessionId: session.id });
    })
    .catch((error) => {
      console.error('Error:', error);
    });
  });
}