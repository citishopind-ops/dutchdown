# Dutchdown

Static product website with direct WhatsApp ordering to +91 9016304096.

## Publish with GitHub Pages
1. Create a GitHub repository named `dutchdown`.
2. Extract the ZIP and upload the contents (index.html, style.css, app.js and assets/) to the repository root on `main`.
3. Open Settings → Pages → Build and deployment.
4. Select Deploy from a branch, branch `main`, folder `/ (root)`, then Save.
5. GitHub shows the live website URL when deployment completes.

The storefront uses relative asset paths and requires no build or credentials.

## Add a product

Open [Product admin](https://citishopind-ops.github.io/dutchdown/admin/) and enter the name,
selling price, category, description, one or more photos, and an optional MP4 reel.
Photos are optimized in the browser before upload. The first photo is the main image.

Create a GitHub fine-grained personal access token as the repository owner. Select only
`dutchdown` and grant repository **Contents: Read and write**. Paste the token into the
admin form and select **Publish product**. The form keeps the token in the open tab
and sends it only to the GitHub API. GitHub saves the catalog and media in one commit
to `main`. The form then checks the live storefront for the new card.
