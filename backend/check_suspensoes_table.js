const url = "https://rpvuvgkvropatkjwfrkt.supabase.co/rest/v1/suspensoes?select=*";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdnV2Z2t2cm9wYXRrandmcmt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODM5NTgsImV4cCI6MjA5NDY1OTk1OH0.XzUbFszdQn0SS5_dbJar5dnR8Ocx0UkvqXEJTXmJinI";

fetch(url, {
  headers: {
    "apikey": key,
    "Authorization": `Bearer ${key}`
  }
})
.then(res => res.json())
.then(data => {
  console.log("=== OBJETOS DE SUSPENSÕES CRUS ===");
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error("Erro:", err));
