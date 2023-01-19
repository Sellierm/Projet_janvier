// Constantes
const addBtn = document.querySelector(".add");
const input = document.querySelector(".inp-group");
const edit = document.querySelector(".editing");

// Fonctions

function removeInput(){
    this.parentElement.remove();
}

function redirectEdit(){
    document.location.href="../html/reservation.html";
}

function addInput(){
    const name = document.createElement("input");
    name.type="text";
    name.placeholder = "Enter Your Name";

    const edits= document.createElement("a");
    edits.className = "editer";
    edits.innerHTML = "<img src='../assets/editer.png' width='15px' height='15px'>";

    const btn = document.createElement("a");
    btn.className = "delete";
    btn.innerHTML = "&times";

    btn.addEventListener("click", removeInput);
    edits.addEventListener("click", redirectEdit);

    const flex = document.createElement("div");
    flex.className = "flex";

    input.appendChild(flex);
    flex.appendChild(name);
    flex.appendChild(btn);
    flex.appendChild(edits);
}

function edition(){
    document.location.href="../html/reservation.html";
}


addBtn.addEventListener("click", addInput);

edit.addEventListener("click", edition);