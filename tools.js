result = prompt("Enter values:", text1 + "\t" + text2);
prompt("values:", orderId+ "\t" + points+ "\t" + email);

// Get the entire text content of the checkout section
const container = document.getElementById('productCheckoutComplete');
const text = container?.innerText || '';

console.log("Raw text content:\n", text);

// Extract values using regular expressions
const points = text.match(/(\d+)\s+points/)?.[1] || '';
const orderId = text.match(/Order ID:\s+([a-f0-9-]+)/i)?.[1] || '';
const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/)?.[0] || '';

prompt("values:", orderId+ "\t" + points+ "\t" + email);
