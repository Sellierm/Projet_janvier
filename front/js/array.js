// Constantes
const addBtn = document.querySelector(".add");
const input = document.querySelector(".inp-group");

// Fonctions

function removeInput(){
    this.parentElement.remove();
}

function addInput(){
    const name = document.createElement("input");
    name.type="text";
    name.placeholder = "Enter Your Name";

    const email = document.createElement("input");
    email.type="email";
    email.placeholder="Enter your Email";

    const btn = document.createElement("a");
    btn.className = "delete";
    btn.innerHTML = "&times";

    btn.addEventListener("click", removeInput);

    const flex = document.createElement("div");
    flex.className = "flex";

    input.appendChild(flex);
    flex.appendChild(name);
    flex.appendChild(email);
    flex.appendChild(btn);
}


addBtn.addEventListener("click", addInput);