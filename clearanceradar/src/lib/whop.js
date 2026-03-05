const WHOP_API_BASE = 'https://api.whop.com/api/v2';
const WHOP_API_KEY = process.env.REACT_APP_WHOP_API_KEY;

// Validate a Whop access token and get membership info
export async function validateWhopToken(accessToken) {
  try {
    const response = await fetch(`${WHOP_API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Whop token validation error:', err);
    return null;
  }
}

// Get membership status for a user
export async function getMembershipStatus(memberId) {
  try {
    const response = await fetch(`${WHOP_API_BASE}/memberships/${memberId}`, {
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('Membership status error:', err);
    return null;
  }
}

// Store access token in session
export function setWhopToken(token) {
  sessionStorage.setItem('whop_token', token);
}

export function getWhopToken() {
  return sessionStorage.getItem('whop_token');
}

export function clearWhopToken() {
  sessionStorage.removeItem('whop_token');
  sessionStorage.removeItem('whop_user');
}

export function setWhopUser(user) {
  sessionStorage.setItem('whop_user', JSON.stringify(user));
}

export function getWhopUser() {
  const user = sessionStorage.getItem('whop_user');
  return user ? JSON.parse(user) : null;
}

// Build Whop OAuth URL
export function getWhopAuthUrl() {
  const clientId = process.env.REACT_APP_WHOP_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.REACT_APP_WHOP_REDIRECT_URI || window.location.origin + '/auth/callback');
  return `https://whop.com/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
}
