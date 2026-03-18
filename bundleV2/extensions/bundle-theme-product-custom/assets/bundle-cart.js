if (document.readyState === "loading") {
  console.log("bundle-cart init (loading)");
  document.addEventListener("DOMContentLoaded", initBundleCartTest);
} else {
  console.log("bundle-cart init (ready)");
  initBundleCartTest();
}

function initBundleCartTest() {
  try {
    // 先尝试读取 shop metafield 中的 offers 配置
    const metaEl = document.getElementById("ciwi-bundle-offers");
    if (metaEl) {
      try {
        let raw = (metaEl.innerText || metaEl.textContent || "").trim();

        // Liquid 输出中可能被包了一层字符串，并且是 Ruby 风格 (=> / nil)
        // 例如：" {\"updatedAt\"=>\"...\", \"offers\"=>[... \"totalBudget\"=>nil ...]}"
        if (raw.startsWith('"') && raw.endsWith('"')) {
          raw = raw.slice(1, -1);
        }

        const jsonLike = raw
          .replace(/=>/g, ":")
          .replace(/\bnil\b/g, "null");

        const offersConfig = JSON.parse(jsonLike);
        console.log("ciwi-bundle-offers metafield config", offersConfig);
      } catch (e) {
        console.error("Failed to parse ciwi-bundle-offers metafield", e);
      }
    } else {
      console.log("ciwi-bundle-offers metafield not found on page");
    }

    enhanceCartPrices();

    // 处理抽屉购物车等动态插入的 DOM
    const observer = new MutationObserver(() => {
      enhanceCartPrices();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch (e) {
    console.error("bundle cart ywtest init error", e);
  }
}

function enhanceCartPrices() {
  try {
    const candidates = [
      '[data-cart-subtotal]',
      '[data-cart-total]',
      '.totals__subtotal-value',
      '.cart__subtotal',
      '.cart__price',
      '.cart__price-amount',
      '.cart-item__price',
      '.cart__footer .price',
      '.cart-items .price'
    ];

    for (const selector of candidates) {
      const nodes = document.querySelectorAll(selector);
      if (!nodes.length) continue;

      nodes.forEach((el) => {
        if (el.querySelector('[data-bundle-ywtest="true"]')) return;

        const span = document.createElement("span");
        span.textContent = " ywtest";
        span.style.marginLeft = "4px";
        span.style.color = "red";
        span.style.fontWeight = "600";
        span.setAttribute("data-bundle-ywtest", "true");

        el.appendChild(span);
      });
    }
  } catch (e) {
    console.error("bundle cart ywtest enhance error", e);
  }
}

