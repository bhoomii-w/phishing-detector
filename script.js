async function analyzeText() {
  const text = document.getElementById("inputText").value;
  const resultDiv = document.getElementById("result");

  if (!text) {
    resultDiv.innerText = "Please enter some text!";
    return;
  }

  resultDiv.innerText = "Analyzing...";

  try {
    const response = await fetch("https://phishing-detector-production-343e.up.railway.app/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    resultDiv.innerText = data.result;
  } catch (error) {
    resultDiv.innerText = "Error connecting to backend";
    console.error(error);
  }
}