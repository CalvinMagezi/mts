# MTSy

Put `mtsy` in your $PATH if you want to launch via:

```
mtsy .
```

This will open mts GUI from any path you specify

# Unregister Deeplink Protocols (macos only)

`unregister-deeplink-protocols.js` is a script to unregister the deeplink protocol used by mts like `mts://`.
This is handy when you want to test deeplinks with the development version of MTS.

# Usage

To unregister the deeplink protocols, run the following command in your terminal:
Then launch MTS again and your deeplinks should work from the latest launched mts application as it is registered on startup.

```bash
node scripts/unregister-deeplink-protocols.js
```

