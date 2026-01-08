Skip to content
Navigation Menu
bitjson
qr-code

Type / to search
Code
Issues
12
Pull requests
2
Actions
Projects
Security
Insights
Owner avatar
qr-code
Public
bitjson/qr-code
Go to file
t
Name		
bitjson
bitjson
SVG-based
de60f23
·
3 years ago
.github
meta and social info
3 years ago
src
re-enable animation previewer
3 years ago
.gitignore
upgrade to latest version of Stencil
8 years ago
LICENSE
revive
3 years ago
favicon.ico
meta and social info
3 years ago
index.html
SVG-based
3 years ago
package-lock.json
chore: release v1.0.2
3 years ago
package.json
chore: release v1.0.2
3 years ago
readme.md
SVG-based
3 years ago
stencil.config.js
revive
3 years ago
tsconfig.json
revive
3 years ago
Repository files navigation
README
MIT license
npm npm downloads Follow Bitjson on Twitter GitHub stars

<qr-code>
A no-framework, no-dependencies, customizable, animate-able, SVG-based <qr-code> HTML element. It's just a single, self-contained Web Component.

bitjson-qr-code-demo.mp4
Announcement post – usage guidance and background information
Interactive demo – try the above demo in your browser
Usage
Import <qr-code> using your build system or framework (e.g. npm install @bitjson/qr-code), or use the standalone script in your HTML <head> element:

<script src="https://unpkg.com/@bitjson/qr-code@1.0.2/dist/qr-code.js"></script>
Then use the component anywhere in your HTML <body> element:

<qr-code contents="https://bitjson.com"></qr-code>
Full Example
Here's an example in pure HTML using most features:

<qr-code
id="qr1"
contents="https://bitjson.com/"
module-color="#1c7d43"
position-ring-color="#13532d"
position-center-color="#70c559"
mask-x-to-y-ratio="1.2"
style="
width: 200px;
height: 200px;
margin: 2em auto;
background-color: #fff;
"
>
  <img src="assets/1.2-x-to-y-ratio-icon.svg" slot="icon" />
</qr-code>

<script>
  document.getElementById('qr1').addEventListener('codeRendered', () => {
    document.getElementById('qr1').animateQRCode('MaterializeIn');
  });
</script>
Animations
Animate in, animate on user interactions like URL hits or detected payments, and/or animate out when the QR code interaction is complete.

Several preset animations are available, simply run them with the element's animateQRCode method:

document.getElementById('qr1').animateQRCode('RadialRipple');
Available built-in presets:

FadeInTopDown
FadeInCenterOut
MaterializeIn
RadialRipple
RadialRippleIn
You can also design your own custom animations! Just pass a function to the qr-code's animateQRCode method, e.g.:

document
.getElementById('qr1')
.animateQRCode((targets, _x, _y, _count, entity) => ({
targets,
from: entity === 'module' ? Math.random() * 200 : 200,
duration: 500,
easing: 'cubic-bezier(.5,0,1,1)',
web: { opacity: [1, 0], scale: [1, 1.1, 0.5] },
}));
The built-in presets use this API internally, so review those for guidance and inspiration. Pull request for new presets are welcome!

Animation Previewer
The animation previewer makes fine-tuning animations much easier: try it by cloning this repo and running the live-reloading package script:

git clone https://github.com/bitjson/qr-code.git
cd qr-code
npm ci
npm start
Then work on your animation in src/index.html using the animation previewer (at the bottom right of the window) to test the last-run animation at various speeds, scrub through it manually, or play it in reverse.

Production build
Disable the just-animate player in src/components/qr-code/qr-code.tsx, then build:

npm run build
You can test the built component by pointing the script in index.html to dist/qr-code.js and opening the page via the local filesystem.

About
A no-framework, no-dependencies, customizable, animate-able, SVG-based <qr-code> HTML element.

qr.bitjson.com/
Topics
svg web-component bitcoin stencil svg-animations ethereum qr-code cryptocurrency animated qr-generator bch web-animations bitcoin-cash qr-code-generator qr-code-component
Resources
Readme
License
MIT license
Activity
Stars
1.4k stars
Watchers
12 watching
Forks
83 forks
Report repository
Releases
1 tags
Deployments
9
github-pages 3 years ago
+ 8 deployments
  Languages
  TypeScript
  56.6%

HTML
42.2%

Other
1.2%
Footer
© 2026 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Community
Docs
Contact
Manage cookies
Do not share my personal information
