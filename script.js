/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
let selectedProducts = [];
let allProducts = [];

async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  // Add unique id to each product if not present
  products.forEach((product, idx) => {
    if (!product.id) product.id = idx.toString();
  });

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Add event listeners and update selection visuals
  addProductCardListeners(products);
  updateProductCardSelection();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

/* Enable product selection */
// Array to keep track of selected products by id
// Helper: visually mark selected cards
function updateProductCardSelection() {
  const cards = document.querySelectorAll(".product-card");

  cards.forEach((card) => {
    const productId = card.getAttribute("data-id");

    if (selectedProducts.includes(productId)) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

// Update the Selected Products section
function updateSelectedProductsList() {
  const selectedList = document.getElementById("selectedProductsList");
  if (!selectedList) return;
  if (selectedProducts.length === 0) {
    selectedList.innerHTML =
      '<div class="placeholder-message">No products selected</div>';
    return;
  }

  // Always use allProducts for lookup so switching categories doesn't break selected list
  selectedList.innerHTML = selectedProducts
    .map((id) => {
      const product = allProducts.find((p) => String(p.id) === id);
      return `
        <div class="selected-product-item">
          <span>${product ? product.name : "Unknown"}</span>
          <button class="remove-selected" data-id="${id}" title="Remove">&times;</button>
        </div>
      `;
    })
    .join("");
}

// Add click event to product cards for selection/unselection
function addProductCardListeners(products) {
  const cards = document.querySelectorAll(".product-card");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const productId = card.getAttribute("data-id");
      if (selectedProducts.includes(productId)) {
        // Unselect
        selectedProducts = selectedProducts.filter((id) => id !== productId);
      } else {
        // Select
        selectedProducts.push(productId);
      }

      updateProductCardSelection();
      updateSelectedProductsList();
      addRemoveSelectedListeners(products);
    });
  });
}

// Add click event to remove buttons in selected products list
function addRemoveSelectedListeners(products) {
  const selectedList = document.getElementById("selectedProductsList");
  if (!selectedList) return;

  selectedList.querySelectorAll(".remove-selected").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute("data-id");
      selectedProducts = selectedProducts.filter((id) => id !== productId);
      updateProductCardSelection();
      updateSelectedProductsList();
      addRemoveSelectedListeners(products);
    });
  });
}
