# 🌹 Wedding Upload Site — Self-Hosting Tutorial

A step-by-step guide to get your wedding photo upload site running.
No coding knowledge required beyond copy-pasting commands.

---

## What You Need

- A computer (Windows, Mac, or Linux) **or** a cheap VPS (Virtual Private Server)
- Node.js installed
- ~15 minutes

---

## Option A: Run on Your Own Computer (Simplest)

Best for: small weddings, guests on the same WiFi network.

### Step 1 — Install Node.js

Go to **https://nodejs.org** and download the **LTS** version.
Install it like any normal program.

Verify it worked — open Terminal (Mac/Linux) or Command Prompt (Windows) and type:
```
node --version
```
You should see something like `v20.x.x`.

---

### Step 2 — Get the project files

Put the three files you received into a folder. Your folder should look like this:
```
wedding-upload/
  ├── server.js
  ├── package.json
  └── public/
        └── index.html
```

---

### Step 3 — Install dependencies

Open Terminal / Command Prompt, navigate to the folder:
```bash
cd path/to/wedding-upload
```

Then install:
```bash
npm install
```
This downloads `express` and `multer` (~2MB). Takes about 30 seconds.

---

### Step 4 — Start the server

```bash
npm start
```

You'll see:
```
🌹 Wedding Upload Server running at http://localhost:3000
📁 Uploads will be saved to: /path/to/wedding-upload/uploads
```

Open **http://localhost:3000** in your browser — the site is live!

---

### Step 5 — Let guests access it (same WiFi)

To share with guests on the same WiFi, find your computer's local IP address:

- **Mac**: System Settings → Wi-Fi → Details → IP Address
- **Windows**: Run `ipconfig` in Command Prompt → look for `IPv4 Address`
- **Linux**: Run `ip a`

It will look like `192.168.1.42`.

Guests go to: **http://192.168.1.42:3000**

> ⚠️ This only works while your computer is on and on the same network.

---

## Option B: Run on a VPS (Accessible from Anywhere)

Best for: guests uploading from home, before/after the wedding.

### Recommended VPS providers (cheapest options)
- **Hetzner Cloud** (Europe, very cheap ~€4/mo) — https://hetzner.com/cloud
- **DigitalOcean** (~$6/mo) — https://digitalocean.com
- **Vultr** (~$5/mo) — https://vultr.com

Choose the cheapest plan (1 CPU, 1–2 GB RAM is plenty).
Pick **Ubuntu 22.04** as the operating system.

---

### Step 1 — Connect to your VPS

You'll receive an IP address (e.g. `65.21.100.42`) and root password by email.

Connect via SSH:
```bash
ssh root@65.21.100.42
```
(On Windows, use [PuTTY](https://putty.org) or the built-in terminal in Windows 11)

---

### Step 2 — Install Node.js on the VPS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verify:
```bash
node --version
```

---

### Step 3 — Upload your files

On your **local computer**, upload the files to the VPS using `scp`:

```bash
scp -r wedding-upload/ root@65.21.100.42:/var/www/wedding-upload
```

Or use a GUI tool like [FileZilla](https://filezilla-project.org) (SFTP mode).

---

### Step 4 — Install dependencies on the VPS

```bash
cd /var/www/wedding-upload
npm install
```

---

### Step 5 — Run it permanently with PM2

`PM2` keeps your server running even after you close the terminal or reboot.

```bash
npm install -g pm2
pm2 start server.js --name wedding-upload
pm2 save
pm2 startup
```

Run the command PM2 prints (it looks like `sudo env PATH=...`).

Check it's running:
```bash
pm2 status
```

---

### Step 6 — Open the firewall port

```bash
ufw allow 3000
ufw allow 22
ufw enable
```

Your site is now live at: **http://65.21.100.42:3000**

---

### Step 7 (Optional) — Use a domain name

If you have a domain (e.g. `photos.ourwedding.com`):

1. In your domain registrar's DNS settings, add an **A record**:
   - Name: `photos`
   - Value: your VPS IP address

2. Install nginx as a reverse proxy:
```bash
apt install -y nginx
```

3. Create a config file:
```bash
nano /etc/nginx/sites-available/wedding
```

Paste this (replace `photos.ourwedding.com`):
```nginx
server {
    listen 80;
    server_name photos.ourwedding.com;

    client_max_body_size 200M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Save (Ctrl+X, then Y, then Enter).

4. Enable it:
```bash
ln -s /etc/nginx/sites-available/wedding /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

5. Add free HTTPS with Certbot:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d photos.ourwedding.com
```

Now your site is at **https://photos.ourwedding.com** 🎉

---

## Where Are the Uploaded Files?

All uploads are saved in the `uploads/` folder inside your project.
Each guest gets their own subfolder named like:
```
uploads/
  1718000000000_Maria_Joao/
    1718000000001_123456.jpg
    1718000000002_789012.mp4
    _info.json        ← guest name, upload time, file list
```

To download everything from your VPS to your computer:
```bash
scp -r root@65.21.100.42:/var/www/wedding-upload/uploads/ ./my-wedding-photos/
```

---

## Customize the Site

Open `public/index.html` and find these lines near the top to change names/text:

```html
<title>Share Your Wedding Memories</title>
...
<span class="eyebrow">A day to remember</span>
<h1>Share your<br /><em>moments with us</em></h1>
...
<p class="subtitle">
  Upload your photos &amp; videos from our special day.<br />
  Up to 15 files per person. No account needed.
</p>
```

To change the **upload limit** (default is 15), edit `server.js`:
```js
const MAX_FILES = 15; // ← change this number
```
And in `public/index.html`:
```js
const MAX_FILES = 15; // ← change this too (same number)
```

---

## View All Uploads (Admin)

Set a secret password in your environment:
```bash
pm2 stop wedding-upload
ADMIN_SECRET=mysecretword pm2 start server.js --name wedding-upload
```

Then visit:
```
http://yoursite.com:3000/admin/list?secret=mysecretword
```

This shows a JSON list of all guests and their uploads.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm: command not found` | Node.js not installed correctly — reinstall from nodejs.org |
| Site loads but upload fails | Check the `uploads/` folder exists and has write permissions |
| Can't access from other devices | Check firewall (`ufw allow 3000`) |
| Large videos time out | Increase nginx `client_max_body_size` to `500M` |
| PM2 process crashes | Run `pm2 logs wedding-upload` to see error messages |

---

## Shutting Down / Cleanup

To stop the server:
```bash
# Local
Ctrl + C in terminal

# VPS with PM2
pm2 stop wedding-upload
```

After the wedding, download your uploads and then you can cancel the VPS subscription.

---

*Made with love for your special day 🌹*
