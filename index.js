import express from "express";

const app = express();

// CORS so Shopify can call this
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// --- CONSTANTS ---
const TAX_RATE = 0.07; // 7%
const SHIPPING_ESTIMATE_YEAR = 15.0; // 🔧 you can adjust later

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// --- MASTER PRODUCT LIST ---
const PRODUCTS = [
  {
    name: "Shampoo",
    url: "https://www.livingearthbeauty.com/products/living-libations-seabuckthorn-shampoo?variant=34971412594854#moreInfo",
    price: 14.0,
    refillsPerYear: 4,
  },
  {
    name: "Conditioner",
    url: "https://www.livingearthbeauty.com/products/living-libations-shine-on-hair-conditioner?pr_prod_strat=jac&pr_rec_id=9d1e8e85e&pr_rec_pid=5417488482470&pr_ref_pid=5417488384166&pr_seq=uniform",
    price: 14.0,
    refillsPerYear: 4,
  },
  {
    name: "Bar Shampoo",
    url: "https://www.livingearthbeauty.com/products/agave-nectar-aloe-organic-shampoo-bar?_pos=1&_sid=3db9a46ef&_ss=r",
    price: 10.0,
    refillsPerYear: 4,
  },
  {
    name: "Bar Conditioner",
    url: "https://www.livingearthbeauty.com/products/morrocco-method-citrus-silk-conditioner-bar?_pos=4&_sid=9c3cde1bb&_ss=r",
    price: 25.8,
    refillsPerYear: 4,
  },
  {
    name: "Bar Body Wash",
    url: "https://www.avodahrogah.com",
    price: 12.95,
    refillsPerYear: 4,
  },
  {
    name: "Body Wash (liquid)",
    url: "https://www.livingearthbeauty.com/search?q=body+scrub",
    price: 0.0,
    refillsPerYear: 4,
  },
  {
    name: "Body Oil",
    url: "https://www.livingearthbeauty.com/search?q=body+oil",
    price: 14.0,
    refillsPerYear: 4,
  },
  {
    name: "Shaving Cream",
    url: "https://mountainroseherbs.com/clean-shave-soap",
    price: 11.95,
    refillsPerYear: 4,
  },
  {
    name: "After Shave",
    url: "https://mountainroseherbs.com/after-shave",
    price: 11.95,
    refillsPerYear: 4,
  },
  {
    name: "Facial Cleanser",
    url: "https://mountainroseherbs.com/buttercream-cleansing-face-wash OR https://mountainroseherbs.com/marshmallow-cloud-facial-cleanser",
    price: 15.0,
    refillsPerYear: 4,
  },
  {
    name: "Toothpaste",
    url: "https://www.livingearthbeauty.com/products/living-libations-neem-enamelizer-toothpaste?_pos=1&_sid=f5b2b449b&_ss=r",
    price: 17.0,
    refillsPerYear: 4,
  },
  {
    name: "Shower Curtain",
    url: "https://beanproducts.com/products/cotton-shower-curtain",
    price: 39.95,
    refillsPerYear: 1,
  },
  {
    name: "Hand Soap",
    url: "https://meliorameansbetter.com/products/foaming-hand-soap-refill-tablets?variant=40539792769139",
    price: 10.99,
    refillsPerYear: 4,
  },
  {
    name: "Toilet Paper",
    url: "https://plantpaper.us/pages/plant-paper",
    price: 69.0,
    refillsPerYear: 4,
  },
  {
    name: "Tampons",
    url: "https://tampontribe.com/products/tampons?selling_plan=626000030&variant=44206457192706",
    price: 10.6,
    refillsPerYear: 12,
  },
  {
    name: "Toilet Cleaner",
    url: "https://meliorameansbetter.com/products/all-purpose-home-cleaner-spray-bottle-kit?variant=42172609429619",
    price: 15.99,
    refillsPerYear: 2,
  },
  {
    name: "Glass Cleaner",
    url: "https://meliorameansbetter.com/products/all-purpose-home-cleaner-spray-bottle-kit?variant=42172609429619",
    price: 15.99,
    refillsPerYear: 2,
  },
  {
    name: "All Purpose Cleaner",
    url: "https://meliorameansbetter.com/products/all-purpose-home-cleaner-spray-bottle-kit?variant=42172609429619",
    price: 15.99,
    refillsPerYear: 2,
  },
  {
    name: "Bleach Alternative",
    url: "https://meliorameansbetter.com/products/oxygen-brightener-bleach-alternative-booster?variant=41059620356211",
    price: 19.99,
    refillsPerYear: 2,
  },
  {
    name: "Rust/Lime Remover",
    url: "",
    price: 0.0,
    refillsPerYear: 0,
  },
  {
    name: "Epsom Salt",
    url: "https://mountainroseherbs.com/epsom-salt",
    price: 5.0,
    refillsPerYear: 2,
  },
  {
    name: "Floss",
    url: "https://www.livingearthbeauty.com/products/drtungs-smart-floss-paperboard?_pos=1&_sid=050196193&_ss=r",
    price: 8.0,
    refillsPerYear: 4,
  },
];

// --- MAIN ENDPOINT ---
app.get("/plan", (req, res) => {
  try {
    const quiz = req.query || {};
    const householdSize = quiz.householdSize || "";
    const topConcerns = quiz.topConcerns || "";
    const wontUseRaw = quiz.wontUse || "";
    const wantToAdd = quiz.wantToAdd || "";

    // normalize "won't use" list
    const wontUseList = wontUseRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.toLowerCase());

    // filter products based on "won't use"
    const includedProducts = PRODUCTS.filter((p) => {
      return !wontUseList.includes(p.name.toLowerCase());
    });

    // calculate pricing
    let yearlySubtotal = 0;
    let firstMonthSubtotal = 0;

    const firstMonthProducts = [];
    const restYearProducts = [];

    includedProducts.forEach((p) => {
      const price = p.price || 0;
      const refills = p.refillsPerYear || 0;

      // assumption: 1 initial unit in month 1 + refills/year AFTER that
      const initialQty = 1;
      const initialCost = round2(initialQty * price);
      const refillsCost = round2(refills * price);
      const totalYearCost = round2(initialCost + refillsCost);

      yearlySubtotal += totalYearCost;
      firstMonthSubtotal += initialCost;

      firstMonthProducts.push({
        name: p.name,
        unit_price: price,
        quantity: initialQty,
        line_total: initialCost,
        url: p.url,
      });

      restYearProducts.push({
        name: p.name,
        unit_price: price,
        refills_per_year: refills,
        cost_rest_of_year: refillsCost,
        total_cost_year: totalYearCost,
      });
    });

    yearlySubtotal = round2(yearlySubtotal);
    firstMonthSubtotal = round2(firstMonthSubtotal);

    const yearTax = round2(yearlySubtotal * TAX_RATE);
    const yearProductsPlusTax = round2(yearlySubtotal + yearTax);
    const yearShipping = SHIPPING_ESTIMATE_YEAR;
    const yearGrandTotal = round2(yearProductsPlusTax + yearShipping);

    const firstMonthTax = round2(firstMonthSubtotal * TAX_RATE);
    const firstMonthTotal = round2(firstMonthSubtotal + firstMonthTax);

    const restYearSubtotal = round2(yearlySubtotal - firstMonthSubtotal);
    const restYearTax = round2(restYearSubtotal * TAX_RATE);
    const restYearTotal = round2(restYearSubtotal + restYearTax);
    const avgMonthRest = round2(restYearTotal / 11); // months 2–12

    const yearTotals = {
      products_subtotal: yearlySubtotal,
      tax_7_percent: yearTax,
      shipping_estimate: yearShipping,
      grand_total: yearGrandTotal,
    };

    const restOfYear = {
      products_subtotal: restYearSubtotal,
      tax_7_percent: restYearTax,
      total_with_tax: restYearTotal,
      average_monthly_cost_months_2_to_12: avgMonthRest,
      products: restYearProducts,
    };

    const schedule = [
      {
        label: "Month 1 – Initial Replacement",
        estimated_total_with_tax: firstMonthTotal,
      },
      {
        label: "Average Months 2–12",
        estimated_monthly_cost: avgMonthRest,
      },
    ];

    let summary = `For your family, replacing ${includedProducts.length} items in this bath & body category for a full year is estimated at about $${yearGrandTotal.toFixed(
      2
    )} (products + 7% tax + estimated shipping).`;

    if (firstMonthTotal > 0) {
      summary += ` Month 1 is about $${firstMonthTotal.toFixed(
        2
      )} as we replace everything once.`;
    }
    if (avgMonthRest > 0) {
      summary += ` Months 2–12 then average around $${avgMonthRest.toFixed(
        2
      )} per month as you move onto a refill schedule.`;
    }

    if (topConcerns) {
      summary += ` We kept your top concerns in mind: ${topConcerns}.`;
    }
    if (wantToAdd) {
      summary += ` You also requested some items not on this list. We’ll review those manually and see what we can source for you: ${wantToAdd}.`;
    }

    const response = {
      summary,
      year_totals: yearTotals,
      first_month: {
        products: firstMonthProducts,
        subtotal: firstMonthSubtotal,
        tax_7_percent: firstMonthTax,
        total_with_tax: firstMonthTotal,
      },
      rest_of_year: restOfYear,
      schedule,
      meta: {
        householdSize,
        wontUse: wontUseList,
        wantToAdd,
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.json(response);
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: "Backend failure" });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Healthy Home Backend running on port " + PORT);
});
