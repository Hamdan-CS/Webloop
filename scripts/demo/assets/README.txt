Put the WebHub screenshots here (PNG):
  webhub-home.png       - home page (post image, project cover, Hamdan's banner)
  webhub-contact.png    - contact form
  webhub-animation.png  - an animated section
  webloop-banner.png    - optional, for the "Welcome to WebLoop" post
Missing files are fine: posts become text posts and banners use a gradient.

Pictures posts (see picturePosts in data.mjs; PNG, JPG or WebP, square works best):
  repos/     ragflow, dify, open-webui, firecrawl          -> "Repos worth knowing"
  artcraft/  01-audio ... 08-three-steps                    -> "Free alternatives to paid creative apps"
  mcp/       01-cover ... 06-21st-magic                     -> "Claude MCP tools for better UI"
  Each image gets its own caption, terminal command and link from data.mjs.
  These cards are drawn by scripts/demo/cards/render-cards.mjs (1080x1080, sharp text):
    node scripts/demo/cards/render-cards.mjs   then   npm run seed:demo
  A changed image replaces the old one in its post (new file name, old file removed).
  A post is skipped until at least one of its images exists; new images are appended
  to an existing post when you re-run npm run seed:demo.
