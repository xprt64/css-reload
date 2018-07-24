# css-reload

Automatic css reload with minimal effort

## What is does

It automatically reloads any modified CSS files from your web page without refreshing it.

## How it does

It listens changes to the CSS files on a SSE (Server Sent Events) connection and reloads the modified CSS file.

## How to use it

Start a container from the image `xprt64/cssreload` and then add the `<script src="//localhost:6972/client.js"></script>` tag to your web pages.

Start the container: `docker run -p "7000:6971" -p "7001:8080" -v "/host/directory/to/watch:/watch/public/directory"  --name cssreload xprt64/cssreload`

The `/host/directory/to/watch` is the directory on the host that will be watched.
The `/watch/public/directory` is the base path; the css files will be served as `/public/directory/file.css`
