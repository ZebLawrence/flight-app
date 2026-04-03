# flight-app

A flight application.

## Getting Started

Coming soon.

## Custom Domain DNS Setup

Clients who want to use a custom domain (e.g. `www.clientdomain.com`) must point a **CNAME** record at the platform hostname before the domain is activated.

### Steps

1. Log in to your DNS provider (e.g. Cloudflare, Route 53, Namecheap).
2. Create a **CNAME** record with the following values:

   | Field | Value |
   |-------|-------|
   | Type  | `CNAME` |
   | Name  | `www` (or the subdomain you want to use) |
   | Value | `platform.yourhost.com` (set via `NEXT_PUBLIC_PLATFORM_HOST`) |

3. Save the record and allow time for DNS propagation — this typically takes **up to 48 hours**, though it often completes within a few hours.
4. Once the record has propagated, enter the custom domain in the tenant's **Basic Info** settings in the admin panel and save.

> **Note:** DNS propagation time depends on your provider and the TTL configured on the record. You can use tools like [dnschecker.org](https://dnschecker.org) to monitor propagation progress.
