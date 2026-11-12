"use strict";

const repo = "citishopind-ops/dutchdown";
const branch = "main";
const apiBase = "https://api.github.com/repos/" + repo;
const marker = "<!-- DUTCHDOWN: NEW PRODUCTS -->";
const maxPhotos = 10;
const megabyte = 1024 * 1024;
const knownCategories = ["Accessories", "Cleaning", "Electronics", "Gifts", "Kitchen", "Other"];
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });
const byId = id => document.getElementById(id);
const form = byId("product-form");
const fields = byId("product-fields");
const photoInput = byId("photos");
const reelInput = byId("reel");
const tokenInput = byId("token");
const feedback = byId("feedback");
const liveLink = byId("view-product");
const commitLink = byId("view-commit");
const checkLive = byId("check-live");
const newProduct = byId("new-product");
const store = new URL("../", location.href);
let photoUrls = [];
let reelUrl = "";
let draftId;
let publishedProduct;
let requestActive = false;

function showStatus(message, state = "working") {
  feedback.hidden = false;
  feedback.dataset.state = state;
  byId("status").textContent = message;
}

function updateDetails() {
  const price = byId("price").valueAsNumber;
  byId("preview-name").textContent = byId("name").value.trim() || "પ્રોડક્ટનું નામ";
  byId("preview-category").textContent = byId("category").value.trim() || "કૅટેગરી";
  byId("preview-description").textContent = byId("description").value.trim() || "પ્રોડક્ટનું વર્ણન અહીં દેખાશે.";
  byId("preview-price").textContent = Number.isFinite(price) ? money.format(price) : "₹ —";
  byId("preview-delivery").hidden = !form.elements.freeDelivery.checked;
}

function previewPhotos() {
  photoUrls.forEach(url => URL.revokeObjectURL(url));
  const files = [...photoInput.files];
  const photoError = files.length > maxPhotos
    ? "વધુમાં વધુ 10 ફોટા પસંદ કરો."
    : files.some(file => !/\.(jpe?g|png|webp)$/i.test(file.name) || !file.size || file.size > 15 * megabyte)
      ? "દરેક ફોટો JPG, PNG અથવા WebP અને 15 MB સુધીનો હોવો જોઈએ."
      : "";
  photoInput.setCustomValidity(photoError);
  if (photoError) photoInput.reportValidity();
  photoUrls = photoError ? [] : files.map(file => URL.createObjectURL(file));

  const image = byId("preview-image");
  const thumbnails = byId("preview-thumbnails");
  byId("photo-placeholder").hidden = photoUrls.length > 0;
  image.hidden = !photoUrls.length;
  image.removeAttribute("src");
  thumbnails.replaceChildren();
  thumbnails.hidden = photoUrls.length < 2;
  if (!photoUrls.length) return;
  image.src = photoUrls[0];

  if (photoUrls.length > 1) {
    photoUrls.forEach((url, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "ફોટો " + (index + 1));
      button.setAttribute("aria-pressed", String(index === 0));
      const thumb = document.createElement("img");
      thumb.src = url;
      thumb.alt = "";
      button.append(thumb);
      button.addEventListener("click", () => {
        image.src = url;
        for (const item of thumbnails.children) item.setAttribute("aria-pressed", String(item === button));
      });
      thumbnails.append(button);
    });
  }
}

function previewReel() {
  if (reelUrl) URL.revokeObjectURL(reelUrl);
  const video = byId("preview-reel");
  const file = reelInput.files[0];
  const reelError = file && (!/\.mp4$/i.test(file.name) || !file.size || file.size > 25 * megabyte)
    ? "25 MB સુધીની MP4 રીલ પસંદ કરો."
    : "";
  reelInput.setCustomValidity(reelError);
  if (reelError) reelInput.reportValidity();
  reelUrl = file && !reelError ? URL.createObjectURL(file) : "";
  if (reelUrl) video.src = reelUrl;
  else video.removeAttribute("src");
  video.load();
  video.hidden = !reelUrl;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function productCard(product, photos, reel) {
  const name = escapeHTML(product.name);
  const category = escapeHTML(product.category);
  const price = money.format(product.price);
  const [cover] = photos;
  const badge = product.freeDelivery ? '<span class="badge">FREE DELIVERY</span>' : "";
  const gallery = photos.length > 1
    ? '<div class="product-photos" role="group" aria-label="Product photos" hidden>' +
      photos.map((photo, index) =>
        '<button type="button" data-photo="' + photo.path + '" aria-label="Show photo ' + (index + 1) +
        '" aria-pressed="' + (index === 0) + '"><img src="' + photo.path +
        '" width="42" height="42" alt="" loading="lazy" decoding="async"></button>').join("") + "</div>"
    : "";
  const reelMarkup = reel
    ? '<details class="product-reel"><summary>▶ Watch product reel</summary>' +
      '<video controls playsinline preload="none" poster="' + cover.path + '" aria-label="' + name + ' product reel">' +
      '<source data-src="' + reel.path + '" type="video/mp4"><a href="' + reel.path + '">Open the product reel</a></video>' +
      '<noscript><p><a href="' + reel.path + '">Open the product reel ↗</a></p></noscript></details>'
    : "";
  const orderText = [
    "Hello Dutchdown! I would like to order:",
    product.name + " × 1 — " + price,
    product.freeDelivery ? "Delivery: FREE" : "Delivery charges: please confirm.",
    "Please confirm availability, payment options and my order."
  ].join("\n");
  const orderUrl = "https://wa.me/919016304096?text=" + encodeURIComponent(orderText);

  return [
    '<article class="card added-product" id="' + product.id + '" data-product-id="' + product.id + '" data-category="' + category + '">',
    '<div class="photo"><img src="' + cover.path + '" width="' + cover.width + '" height="' + cover.height +
      '" alt="' + name + '" loading="lazy" decoding="async">' + badge + "</div>",
    gallery,
    reelMarkup,
    '<p class="category">' + escapeHTML(product.category.toUpperCase()) + '</p><h3>' + name + '</h3>',
    '<p class="description">' + escapeHTML(product.description) + '</p>',
    '<div class="card-bottom"><strong>' + price + '</strong><a class="direct-order" href="' + orderUrl +
      '" aria-label="Order ' + name + ' on WhatsApp">Order on WhatsApp ↗</a></div>',
    "</article>"
  ].filter(Boolean).join("\n");
}

async function preparePhoto(file, path) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("ફોટો વાંચી શકાયો નહીં. JPG, PNG અથવા WebP ફાઇલ ફરી પસંદ કરો.");
  }
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.87));
    if (!blob || !["image/webp", "image/png"].includes(blob.type)) throw new Error("ફોટો તૈયાર થઈ શક્યો નહીં.");
    const extension = blob.type === "image/webp" ? ".webp" : ".png";
    return { path: path + extension, blob, width: canvas.width, height: canvas.height };
  } finally {
    bitmap.close();
  }
}

async function prepareReel(file, directory) {
  if (!file) return null;
  const signature = new Uint8Array(await file.slice(4, 8).arrayBuffer());
  if (String.fromCharCode(...signature) !== "ftyp") throw new Error("રીલ વાંચી શકાયી નહીં. માન્ય MP4 ફાઇલ પસંદ કરો.");
  return { path: directory + "/reel.mp4", blob: file };
}

function base64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("ફાઇલ વાંચી શકાયી નહીં. ફરી પસંદ કરો."));
    reader.readAsDataURL(blob);
  });
}

function githubClient(token) {
  return async (path, method = "GET", data, raw = false) => {
    const headers = {
      Authorization: "Bearer " + token,
      Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (data) headers["Content-Type"] = "application/json";
    const response = await fetch(apiBase + path, {
      method, headers, body: data ? JSON.stringify(data) : undefined, cache: "no-store",
      redirect: "error", signal: AbortSignal.timeout(90_000)
    });
    if (response.ok) return raw ? response.text() : response.json();
    const messages = {
      401: "GitHub ટોકન અમાન્ય છે અથવા તેની મુદત પૂરી થઈ છે.",
      403: "GitHub એ ઍક્સેસ આપી નહીં. dutchdown માટે Contents → Read and write તપાસો.",
      404: "GitHub પર રિપોઝિટરી અથવા ફાઇલ મળી નહીં. ટોકનમાં dutchdown પસંદ છે તે તપાસો.",
      409: "GitHub પર બીજો ફેરફાર થયો છે. ફરી Publish કરો.",
      422: "GitHub ફેરફાર સ્વીકારી શક્યું નહીં. ફાઇલ અને રિપોઝિટરીની પરવાનગી તપાસો.",
      429: "GitHub પર હમણાં વધુ વિનંતીઓ થઈ છે. થોડી વાર પછી ફરી પ્રયાસ કરો."
    };
    const error = new Error(messages[response.status] || "GitHub સાથે પ્રકાશન દરમિયાન ભૂલ આવી. ફરી પ્રયાસ કરો.");
    error.status = response.status;
    throw error;
  };
}

async function publishProduct(github, product, photos, reel) {
  const card = productCard(product, photos, reel);
  const getHead = () => github("/git/ref/heads/" + branch);
  const productAttribute = 'data-product-id="' + product.id + '"';
  const media = reel ? [...photos, reel] : photos;
  const files = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    const head = (await getHead()).object.sha;
    const commit = await github("/git/commits/" + head);
    const html = await github("/contents/index.html?ref=" + head, "GET", undefined, true);
    if (html.includes(productAttribute)) return head;
    if (html.split(marker).length !== 2) {
      throw new Error("સ્ટોરના કૅટલૉગમાં પ્રોડક્ટ ઉમેરવાની જગ્યા મળી નહીં.");
    }
    if (!files.length) {
      for (const [index, file] of media.entries()) {
        const isReel = file === reel;
        showStatus(isReel ? "રીલ અપલોડ થઈ રહી છે…" : "ફોટો " + (index + 1) + " / " + photos.length + " અપલોડ થઈ રહ્યો છે…");
        const result = await github("/git/blobs", "POST", { content: await base64(file.blob), encoding: "base64" });
        files.push({ path: file.path, mode: "100644", type: "blob", sha: result.sha });
      }
    }
    showStatus("કૅટલૉગમાં પ્રોડક્ટ સેવ થઈ રહી છે…");
    const updatedHtml = html.replace(marker, () => marker + "\n" + card + "\n");
    const tree = await github("/git/trees", "POST", {
      base_tree: commit.tree.sha,
      tree: [{ path: "index.html", mode: "100644", type: "blob", content: updatedHtml }, ...files]
    });
    const updated = await github("/git/commits", "POST", {
      message: "Add product: " + product.name,
      tree: tree.sha,
      parents: [head]
    });
    try {
      await github("/git/refs/heads/" + branch, "PATCH", { sha: updated.sha, force: false });
      return updated.sha;
    } catch (error) {
      const current = (await getHead()).object.sha;
      if (current === updated.sha) return updated.sha;
      if (current === head || attempt === 2) throw error;
    }
  }
}

async function verifyLive(product, poll = false) {
  const isCurrent = () => publishedProduct === product;
  checkLive.disabled = true;
  for (let attempt = 0; attempt < (poll ? 15 : 1) && isCurrent(); attempt++) {
    try {
      const url = new URL(store);
      url.searchParams.set("catalog_check", Date.now());
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (response.ok && (await response.text()).includes('data-product-id="' + product.id + '"')) {
        if (!isCurrent()) return;
        liveLink.hidden = false;
        checkLive.hidden = true;
        showStatus("પ્રોડક્ટ લાઇવ છે.", "success");
        return;
      }
    } catch {
      // A temporary network error can be checked again without another publish.
    }
    if (poll && attempt < 14 && isCurrent()) await new Promise(resolve => setTimeout(resolve, 8000));
  }
  if (isCurrent()) {
    checkLive.disabled = false;
    showStatus("પ્રોડક્ટ GitHub પર સેવ થઈ ગઈ છે. લાઇવ સ્ટોર અપડેટ થવામાં થોડી મિનિટ લાગી શકે છે.");
  }
}

async function submit(event) {
  event.preventDefault();
  if (requestActive || publishedProduct) return;
  const name = byId("name").value.trim().replace(/\s+/g, " ");
  const category = byId("category").value.trim().replace(/\s+/g, " ");
  const description = byId("description").value.trim();
  const token = tokenInput.value.trim();
  if (!name || !category || !description || /^all$/i.test(category)) {
    showStatus("પ્રોડક્ટનું નામ, વર્ણન અને કૅટેગરી ભરો. કૅટેગરી માટે ‘All’ સિવાયનું નામ લખો.", "error");
    return;
  }
  if (!token.startsWith("github_pat_")) {
    showStatus("dutchdown રિપોઝિટરી માટેનો GitHub fine-grained ટોકન પેસ્ટ કરો.", "error");
    tokenInput.focus();
    return;
  }

  draftId ||= "product-" + crypto.randomUUID();
  const product = {
    id: draftId, name, description,
    category: knownCategories.find(item => item.toLowerCase() === category.toLowerCase()) || category,
    price: byId("price").valueAsNumber,
    freeDelivery: form.elements.freeDelivery.checked
  };
  const photoFiles = [...photoInput.files];
  const reelFile = reelInput.files[0];
  requestActive = true;
  fields.disabled = true;
  showStatus("ફોટા અને રીલ તૈયાર થઈ રહ્યાં છે…");
  try {
    const directory = "assets/products/" + product.id;
    const reel = await prepareReel(reelFile, directory);
    const photos = [];
    for (const [index, file] of photoFiles.entries()) {
      photos.push(await preparePhoto(file, directory + "/photo-" + (index + 1)));
    }
    const sha = await publishProduct(githubClient(token), product, photos, reel);
    publishedProduct = product;
    liveLink.href = new URL("#" + product.id, store);
    commitLink.href = "https://github.com/" + repo + "/commit/" + sha;
    commitLink.hidden = false;
    checkLive.hidden = false;
    newProduct.hidden = false;
    showStatus("પ્રોડક્ટ GitHub પર સેવ થઈ ગઈ છે. લાઇવ સ્ટોર અપડેટ થઈ રહ્યો છે…");
    void verifyLive(product, true);
  } catch (error) {
    const message = ["TypeError", "TimeoutError"].includes(error.name)
      ? "કનેક્શન તૂટી ગયું અથવા સમય પૂરો થયો. ફરી Publish કરવાથી એ જ પ્રોડક્ટ તપાસીને આગળ વધશે."
      : error.message;
    showStatus(message, "error");
    fields.disabled = false;
  } finally {
    requestActive = false;
  }
}

form.addEventListener("input", updateDetails);
form.addEventListener("submit", submit);
photoInput.addEventListener("change", previewPhotos);
reelInput.addEventListener("change", previewReel);
checkLive.addEventListener("click", () => void verifyLive(publishedProduct));
newProduct.addEventListener("click", () => {
  const token = tokenInput.value;
  form.reset();
  tokenInput.value = token;
  publishedProduct = null;
  draftId = null;
  fields.disabled = false;
  feedback.hidden = true;
  liveLink.hidden = true;
  commitLink.hidden = true;
  checkLive.hidden = true;
  newProduct.hidden = true;
  previewPhotos();
  previewReel();
  updateDetails();
  byId("name").focus();
});
