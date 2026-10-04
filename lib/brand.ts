const img = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Everything brand-specific lives here. Re-skin the starter by editing this file. */
export const brand = {
  name: "Jef&Carey",
  prefix: "JC",
  heroEyebrow: "Small-batch · Baked to order",
  heroHeadline: "Baked the day it leaves our kitchen.",
  tagline: "Cinnamon rolls, donuts, cookies and cakes, baked to order in small batches.",
  promise: "Nothing sits on a shelf. We bake your order, box it and send it out within 2 business days.",
  storyHeadline: "One kitchen. Nothing baked ahead.",
  story: [
    "Jef&Carey started with a tray of cinnamon rolls baked for a neighbour's birthday. The neighbour asked for two more trays the following week.",
    "We still bake the same way: real butter, dough proofed overnight, and every order mixed after it comes in, not pulled from a freezer.",
    "Each box carries its bake date, so you know exactly how fresh it is when it reaches you.",
  ],
  storyImageAlt: "Freshly baked bread and pastries on bakery shelves",
  shippingCopy: [
    "We bake your order after it comes in and hand it to our courier within 2 business days.",
    "Metro Manila: 1 to 2 days after dispatch. Luzon: 2 to 4 days. Visayas and Mindanao: 3 to 6 days.",
    "Cash on delivery is available nationwide. Shipping is free once your order reaches the free-shipping amount shown in your cart.",
  ],
  faqs: [
    { q: "How long does delivery take?", a: "We bake and dispatch within 2 business days. After that, expect 1 to 2 days for Metro Manila, 2 to 4 days for the rest of Luzon, and 3 to 6 days for Visayas and Mindanao." },
    { q: "Can I pay cash on delivery?", a: "Yes, anywhere our courier delivers. Have the exact amount ready for the rider." },
    { q: "How does GCash payment work?", a: "Send the order total to the GCash number shown at checkout, then type the reference number from your GCash receipt into the form. We check it within a day and then start baking." },
    { q: "How long do your bakes stay fresh?", a: "Rolls, donuts and loaves are best within 3 days at room temperature. Cookies and brownies keep for 2 weeks in a sealed container. Cakes and cupcakes keep for 4 days in the ref. Everything except frosted cakes freezes well for a month." },
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
