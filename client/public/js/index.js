fetch("http://localhost:3008/api/hello")
.then((response) => response.json())
.then((data) => {
    document.getElementById("message").innerText = data.message;
})