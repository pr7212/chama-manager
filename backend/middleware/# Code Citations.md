# Code Citations

## License: unknown
https://github.com/titobundy/node-jwt-poc/tree/8674d12b683ceb4fb01510c6856358fae8fe2da9/routes/auth.routes.js

```
require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login'
```


## License: unknown
https://github.com/IsmailAISSAMI/pfe-back/tree/ebf8656726b2923175971c9416299194605b6fac/src/routes/auth.route.js

```
.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router
```


## License: unknown
https://github.com/f4rukyldrm/nextjs-tutorial/tree/0e2aa21414a2ec4d7820ba8733dce8deb3a4da4e/src/app/dashboard/%28auth%29/register/page.js

```
value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }
```


## License: unknown
https://github.com/mphung1/ChessPoker/tree/4ab90b771f65ccc0946fc77424ecdf02f296e107/server/client/src/pages/Auth/SignUp.tsx

```
/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json
```

