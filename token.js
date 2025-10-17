(async () => {
  const clientId = "0000000040170455";
  const redirectUri = "https://login.live.com/oauth20_desktop.srf";
  const scope = "service::prod.rewardsplatform.microsoft.com::MBI_SSL offline_access";
  const tokenUrl = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
  const proxy = "https://corsproxy.io/?"; // ⚠️ Public proxy (use your own for safety)

  // === Helpers ===
  const saveTokens = (data) => {
    localStorage.setItem("msTokens", JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: Date.now() + (data.expires_in * 1000),
    }));
  };

  const loadTokens = () => {
    const t = localStorage.getItem("msTokens");
    return t ? JSON.parse(t) : null;
  };

  // === Manual Refresh Function ===
  const manualRefresh = async () => {
    const tokens = loadTokens();
    if (!tokens?.refresh_token) {
      alert("⚠️ No refresh token found — please log in first!");
      return;
    }

    const newAccess = await refreshAccessToken(tokens.refresh_token);
    if (newAccess) {
      alert("✅ Access token refreshed manually!");
      console.log("🎟️ New access token:", newAccess);
    } else {
      alert("❌ Manual refresh failed — login again required.");
    }
  };

  const refreshAccessToken = async (refresh_token) => {
    console.log("🔁 Refreshing access token...");
    const form = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token,
      redirect_uri: redirectUri,
      scope,
    });

    const resp = await fetch(proxy + encodeURIComponent(tokenUrl), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const data = await resp.json();
    if (data.access_token) {
      saveTokens(data);
      console.log("✅ Token refreshed successfully!");
      return data.access_token;
    } else {
      console.error("❌ Failed to refresh:", data);
      localStorage.removeItem("msTokens");
      return null;
    }
  };

  const getValidAccessToken = async () => {
    const tokens = loadTokens();

    if (tokens) {
      const expired = Date.now() > tokens.expires_in - (60 * 1000);
      if (!expired) {
        console.log("🟢 Using cached access token.");
        return tokens.access_token;
      } else if (tokens.refresh_token) {
        return await refreshAccessToken(tokens.refresh_token);
      }
    }

    // === Login flow ===
    const state = crypto.randomUUID();
    const authUrl = new URL("https://login.live.com/oauth20_authorize.srf");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);

    const loginWindow = window.open(authUrl.href, "msLogin", "width=500,height=700");

    return await new Promise((resolve) => {
      const poll = setInterval(async () => {
        try {
          const url = new URL(loginWindow.location.href);
          if (url.hostname === "login.live.com" && url.pathname === "/oauth20_desktop.srf") {
            const code = url.searchParams.get("code");
            if (code) {
              clearInterval(poll);
              loginWindow.close();
              console.log("🔑 Authorization code:", code);

              const form = new URLSearchParams({
                grant_type: "authorization_code",
                client_id: clientId,
                code,
                redirect_uri: redirectUri,
                scope,
              });

              const resp = await fetch(proxy + encodeURIComponent(tokenUrl), {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: form.toString(),
              });

              const data = await resp.json();
              if (data.access_token) {
                saveTokens(data);
                console.log("✅ Access token obtained!");
                resolve(data.access_token);
              } else {
                console.error("❌ Token exchange failed:", data);
                resolve(null);
              }
            }
          }
        } catch {
          // ignore CORS errors until redirected
        }
      }, 1000);
    });
  };

  // === Auto refresh loop ===
  const startAutoRefresh = async () => {
    const tokens = loadTokens();
    if (!tokens) return console.warn("⚠️ No tokens found for auto-refresh.");

    const interval = Math.max(5 * 60 * 1000, tokens.expires_in - Date.now() - (2 * 60 * 1000));
    console.log(`🕐 Next auto-refresh in ${Math.round(interval / 60000)} minutes`);

    setTimeout(async () => {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      if (refreshed) {
        startAutoRefresh(); // schedule next one
      } else {
        console.error("⚠️ Auto-refresh failed — login again required.");
      }
    }, interval);
  };

  // === Show Access Token Function ===
  const showAccessToken = () => {
    const tokens = loadTokens();
    if (!tokens?.access_token) {
      alert("⚠️ No access token found — please log in first!");
      return;
    }
    const minsLeft = Math.round((tokens.expires_in - Date.now()) / 60000);
    console.log("🎟️ Access token:", tokens.access_token);
    prompt(`Access token (expires in ${minsLeft} min):`, tokens.access_token);
  };

  // === Create Buttons ===
  const addControlButtons = () => {
    const container = document.createElement("div");
    container.style = `
      position: fixed; bottom: 20px; right: 20px;
      display: flex; flex-direction: column; gap: 8px;
      z-index: 99999;
    `;

    const btn = document.createElement("button");
    btn.textContent = "♻️ Manual Refresh Token";
    btn.style = buttonStyle();
    btn.onclick = manualRefresh;
    container.appendChild(btn);

    const showBtn = document.createElement("button");
    showBtn.textContent = "👁️ Show Access Token";
    showBtn.style = buttonStyle("#28a745");
    showBtn.onclick = showAccessToken;
    container.appendChild(showBtn);

    document.body.appendChild(container);
  };

  const buttonStyle = (bg = "#0078d7") => `
    background: ${bg};
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-family: sans-serif;
    box-shadow: 0 0 8px rgba(0,0,0,0.3);
  `;

  // === Main ===
  const token = await getValidAccessToken();
  if (token) {
    console.log("🎟️ Access Token:", token); prompt("Copy",localStorage.msTokens);
	if (!window.location.href.includes("bing.com")) {
		window.open('https://bing.com');
	}
    //alert("✅ Access token ready! Auto-refresh enabled. Buttons added."); 
    startAutoRefresh();
    //addControlButtons();
  } else {
    alert("❌ Could not get access token.");
  }
})();

