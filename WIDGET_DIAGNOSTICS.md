# Widget Loading Diagnostics Guide

## Issue: Widget Not Showing on Office Laptop

### Server Status: ✅ Working Correctly
- Server is returning `structuredContent` correctly
- Logs show: `hasStructuredContent: true`
- Response contains: `hotels`, `total`, `dates`, `facets`, `pagination`, `searchParams`
- Widget resource is registered: `ui://widget/hotel-results.html`

### Client Status: ❌ Blocked on Office Laptop
- Widget works on personal laptop ✅
- Widget doesn't work on office laptop ❌
- **This indicates corporate firewall/network restrictions**

## How to Diagnose on Office Laptop

### Step 1: Open Browser Console
1. Open ChatGPT in Chrome on office laptop
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Make a hotel search request
5. Look for diagnostic messages starting with 🔍

### Step 2: Check Diagnostic Messages
Look for these messages in the console:

#### ✅ Widget Loaded Successfully:
```
🔍 Widget initialized. Checking for data...
📍 Location: https://chatgpt-com.web-sandbox.oaiusercontent.com/...
🔍 window.openai exists: true
🔍 window.openai.toolOutput: {hotels: [...], ...}
✅ Found toolOutput: {...}
✅ Widget rendered successfully!
```

#### ❌ Widget Blocked (Expected on Office Laptop):
```
🔍 Widget initialized. Checking for data...
📍 Location: https://chatgpt-com.web-sandbox.oaiusercontent.com/...
🔍 window.openai exists: false  ← Widget sandbox blocked
⚠️ No window.openai.toolOutput found initially
❌ Timeout: No data received after 30 seconds
```

### Step 3: Check Network Tab
1. Go to **Network** tab in Developer Tools
2. Filter by "widget" or "hotel-results"
3. Look for failed requests (red status)
4. Check if requests are blocked by firewall

### Step 4: Check for Error Messages
Look for these error patterns:
- `net::ERR_BLOCKED_BY_CLIENT` - Browser extension blocking
- `net::ERR_CONNECTION_REFUSED` - Firewall blocking
- `CORS error` - Cross-origin restrictions
- `Content Security Policy` - CSP blocking

## Common Causes

### 1. Corporate Firewall Blocking Widget Sandbox
**Symptom:** `window.openai` is `undefined`
**Cause:** Corporate firewall blocking `web-sandbox.oaiusercontent.com`
**Solution:** Contact IT to whitelist:
- `*.web-sandbox.oaiusercontent.com`
- `*.oaiusercontent.com`

### 2. Corporate Proxy Blocking External Resources
**Symptom:** Widget HTML doesn't load
**Cause:** Corporate proxy blocking ChatGPT's widget sandbox
**Solution:** Configure proxy to allow ChatGPT domains

### 3. Browser Security Policies
**Symptom:** Widget loads but data doesn't inject
**Cause:** Browser security policies blocking `window.openai.toolOutput`
**Solution:** Check browser security settings, disable strict policies

### 4. Browser Extensions
**Symptom:** Widget blocked by extension
**Cause:** Ad blockers or security extensions blocking iframes
**Solution:** Disable extensions temporarily to test

## Solutions

### For Office Laptop (Corporate Network)

#### Option 1: Contact IT Administrator
Ask IT to whitelist these domains:
- `*.web-sandbox.oaiusercontent.com`
- `*.oaiusercontent.com`
- `https://chatgpt.com`
- `https://www.marriott.com` (for images)
- `https://cache.marriott.com` (for images)

#### Option 2: Use Personal Network
- Disconnect from corporate VPN
- Use personal Wi-Fi or mobile hotspot
- Test if widget loads correctly

#### Option 3: Use Personal Device
- Test on personal laptop/phone
- Use personal network (not corporate)
- Verify widget works correctly

### For Personal Laptop (Already Working)
- No action needed
- Widget should continue working

## Verification Steps

### On Office Laptop:
1. Open browser console (F12)
2. Make a hotel search
3. Check console for diagnostic messages
4. Look for `window.openai` status
5. Check if `toolOutput` is injected
6. Verify widget container exists

### Expected Console Output (Working):
```
🔍 Widget initialized. Checking for data...
📍 Location: https://chatgpt-com.web-sandbox.oaiusercontent.com/...
🔍 window.openai exists: true
🔍 window.openai.toolOutput: {hotels: Array(4), ...}
✅ Found toolOutput: {hotels: Array(4), ...}
✅ toolOutput has hotels array with 4 hotels - rendering...
✅ Widget rendered successfully!
```

### Expected Console Output (Blocked):
```
🔍 Widget initialized. Checking for data...
📍 Location: https://chatgpt-com.web-sandbox.oaiusercontent.com/...
🔍 window.openai exists: false
⚠️ No window.openai.toolOutput found initially
🔄 Polling attempt 1 (0.1s)...
🔄 Polling attempt 10 (0.5s)...
🔄 Polling attempt 60 (12.0s)...
❌ Timeout: No data received after 30 seconds
```

## Technical Details

### Widget Communication Flow:
1. **Server** returns `structuredContent` in tool response
2. **ChatGPT** receives response and loads widget HTML
3. **ChatGPT** injects `structuredContent` into `window.openai.toolOutput`
4. **Widget** polls for `window.openai.toolOutput`
5. **Widget** renders hotels when data is found

### Where It Fails on Office Laptop:
- **Step 2:** Widget HTML might not load (firewall blocking sandbox)
- **Step 3:** `window.openai.toolOutput` might not inject (firewall blocking communication)
- **Step 4:** Widget polls but never receives data

## Summary

✅ **Server is working correctly** - Widget is being passed properly
❌ **Office laptop is blocked** - Corporate firewall preventing widget from loading
✅ **Personal laptop works** - Confirms widget functionality is correct

**Next Steps:**
1. Check browser console on office laptop for diagnostic messages
2. Contact IT administrator to whitelist ChatGPT widget domains
3. Test on personal network (without corporate VPN)
4. Use personal device if corporate network restrictions cannot be resolved

