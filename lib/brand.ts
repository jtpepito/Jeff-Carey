const img = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Everything brand-specific lives here. Re-skin the starter by editing this file. */
export const brand = {
  name: "Jef&Carey",
  prefix: "JC",
  /** Provinces we deliver to, spelled as in data/ph-locations.json. Leave empty to deliver nationwide. */
  deliveryProvinces: ["Cebu"] as string[],
  heroEyebrow: "Baked to order · Delivered in Cebu",
  heroHeadline: "Frozen dough. Baked when you order.",
  tagline: "Cinnamon rolls and cupcakes, baked only when your order comes in.",
  promise: "We mix and freeze the dough in small batches, then bake it only when your order comes in. Nothing sits on a shelf.",
  storyHeadline: "Mixed ahead. Baked to order."
  story: [
    "Jef&Carey started with a tray of cinnamon rolls baked for a neighbour's birthday. The neighbour asked for two more trays the following week.",
    "We still make it the same way: real butter, dough proofed overnight, then frozen in small batches so it keeps its best. It only goes into the oven when your order comes in.",
    "Each box carries its bake date, so you know it was baked for you, not for a shelf.",
  ],
  storyImageAlt: "Freshly baked bread and pastries on bakery shelves",
  shippingCopy: [
    "We deliver within Cebu province only, so everything arrives fresh.",
    "Your order is baked from frozen dough after it comes in and sent out within 2 business days. Cebu City, Mandaue, Lapu-Lapu and Talisay usually get it the same day it leaves us; towns further out, the next day.",
    "Cash on delivery is available anywhere in Cebu. Delivery is free once your order reaches the free-delivery amount shown in your cart.",
  ],
  faqs: [
    { q: "Where do you deliver?", a: "Anywhere in Cebu province, and only there for now. Baked goods don't travel well, and we would rather not ship something that arrives stale." },
    { q: "Can I pick up my order instead?", a: "Yes. Choose Pickup at checkout and there is no delivery fee. We'll text you when it's ready." },
    { q: "How long does delivery take?", a: "We bake your order from frozen dough and send it out within 2 business days. Cebu City, Mandaue, Lapu-Lapu and Talisay usually get it the same day it leaves us; towns further out, the next day." },
    { q: "Can I pay cash on delivery?", a: "Yes, anywhere in Cebu. Have the exact amount ready for the rider." },
    { q: "How does GCash payment work?", a: "Send the order total to the GCash number shown at checkout, then type the reference number from your GCash receipt into the form. We check it within a day and then start baking." },
    { q: "How long do your bakes stay fresh?", a: "They are baked only when you order, so they reach you fresh. Cinnamon rolls are best within 3 days at room temperature, or a month in the freezer. Cupcakes keep for 4 days in the ref." },
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
