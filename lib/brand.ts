const img = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Everything brand-specific lives here. Re-skin the starter by editing this file. */
export const brand = {
  name: "Jef&Carey",
  prefix: "JC",
  /** Provinces we deliver to, spelled as in data/ph-locations.json. Leave empty to deliver nationwide. */
  deliveryProvinces: ["Cebu"] as string[],
  heroEyebrow: "Small batch · Baked to order · Cebu",
  heroHeadline: "Baked for your order, not for a shelf.",
  tagline: "Cinnamon rolls and cupcakes, baked to order in Cebu.",
  promise: "Real-butter dough, proofed overnight and frozen at its best. It goes into the oven only when your order comes in, so what reaches you was baked for you.",
  storyHeadline: "Why we freeze the dough.",
  story: [
    "Jef&Carey started with a tray of cinnamon rolls baked for a neighbour's birthday. The neighbour asked for two more trays the following week.",
    "Freezing is how a small kitchen bakes to order. We mix the dough with real butter, proof it overnight and freeze it in small batches at its best, so every order can go into the oven the moment it comes in instead of waiting on a shelf.",
    "Every box carries its bake date. If it says today, it was baked today, for you.",
  ],
  storyImageAlt: "Freshly baked bread and pastries on bakery shelves",
  shippingCopy: [
    "We deliver within Cebu province only, so everything arrives fresh.",
    "Your order goes into the oven after it comes in and leaves our kitchen within 2 business days. Cebu City, Mandaue, Lapu-Lapu and Talisay usually get it the same day it leaves us; towns further out, the next day.",
    "Cash on delivery is available anywhere in Cebu. Delivery is free once your order reaches the free-delivery amount shown in your cart.",
  ],
  faqs: [
    { q: "Where do you deliver?", a: "Anywhere in Cebu province, and only there for now. Baked goods don't travel well, and we would rather not ship something that arrives stale." },
    { q: "Can I pick up my order instead?", a: "Yes. Choose Pickup at checkout and there is no delivery fee. We'll text you when it's ready." },
    { q: "How long does delivery take?", a: "Your order goes into the oven after it comes in and leaves our kitchen within 2 business days. Cebu City, Mandaue, Lapu-Lapu and Talisay usually get it the same day it leaves us; towns further out, the next day." },
    { q: "Can I pay cash on delivery?", a: "Yes, anywhere in Cebu. Have the exact amount ready for the rider." },
    { q: "How does GCash payment work?", a: "Send the order total to the GCash number shown at checkout, then type the reference number from your GCash receipt into the form. We check it within a day and then start baking." },
    { q: "Why do you freeze the dough?", a: "It is how a small kitchen bakes to order. The dough is mixed, proofed overnight and frozen at its best, then baked only for the orders that come in. Nothing is baked ahead and left waiting." },
    { q: "How long do your bakes stay fresh?", a: "They are baked for your order, so they reach you at their best. Cinnamon rolls keep 3 days at room temperature and reheat well; the cupcakes keep 4 days in the ref." },
    { q: "What if something arrives damaged?", a: "Send us a photo within 2 days of delivery and we'll replace it or refund you, your choice." },
  ],
  gallery: [
    img("1509365465985-25d11c17e812", 600),
    img("1551024601-bec78aea704b", 600),
    img("1499636136210-6f4ee915583e", 600),
    img("1533134242443-d4fd215305ad", 600),
    img("1550617931-e17a7b70dce2", 600),
    img("1606890737304-57a1ca8a5b62", 600),
  ],
  storyImage: img("1517433670267-08bbd4be890f", 1200),
  social: "@jefandcarey",
};
