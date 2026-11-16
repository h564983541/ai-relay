# ai-relay

EdgeOne Makers relay for the cf-ai-image Cloudflare Worker. The workers.dev origin is unreachable from mainland-China networks, so this edge function forwards requests to the Worker server-side and rewrites image URLs in responses to this relay's own origin. No secrets in this repo: the app's Authorization header (the Worker's own API key) is forwarded untouched.
