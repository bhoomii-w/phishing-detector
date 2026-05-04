async function analyzeText() {
  const text = document.getElementById("inputText").value;
  const resultDiv = document.getElementById("result");

  if (!text) {
    resultDiv.innerText = "Please enter some text!";
    return;
  }

  resultDiv.innerText = "Analyzing...";

  try {
    const response = await fetch("http://localhost:5000/analyze", {
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