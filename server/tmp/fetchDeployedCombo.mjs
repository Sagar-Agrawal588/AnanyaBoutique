const rawUrl = process.argv[2];
const url = String(rawUrl || "").replace(/^"(.*)"$/, "$1");

if (!url) {
  throw new Error("URL is required");
}

const response = await fetch(url, {
  headers: {
    Accept: "application/json",
  },
});

console.log(`STATUS ${response.status}`);
console.log(await response.text());
