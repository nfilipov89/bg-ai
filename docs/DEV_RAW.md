# Dev суров отговор

```javascript
const express = require('express');
const router = express.Router();
const { getStatus } = require('./status.controller');

router.get('/status', getStatus);

module.exports = router;
```
```