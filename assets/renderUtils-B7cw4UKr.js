function d(n,i){document.getElementById(n).innerHTML=i.map(e=>`
        <div class="metric-card">
            <h3>${e.title}</h3>
            <div class="value ${e.sentiment}">${e.value}</div>
            <div class="subtext">${e.subtext}</div>
        </div>
    `).join("")}function v(n,i){const e=document.getElementById(n),r=e.querySelectorAll(".view-toggle-option"),a=e.querySelector(".view-toggle-indicator");function s(t){e.querySelector(".view-toggle-option.active")!==t&&(r.forEach(l=>l.classList.remove("active")),t.classList.add("active"),a.style.width=`${t.offsetWidth}px`,a.style.transform=`translateX(${t.offsetLeft}px)`,i(t.dataset.value))}const c=e.querySelector(".view-toggle-option.active");a.style.width=`${c.offsetWidth}px`,a.style.transform=`translateX(${c.offsetLeft}px)`,r.forEach(t=>{t.addEventListener("click",()=>s(t))})}function u(n,i,e="Key Findings"){!i||i.length===0||(document.getElementById(n).innerHTML=`
        <div class="interpretation">
            <h3>${e}</h3>
            <ul>
                ${i.map(r=>`<li>${r}</li>`).join("")}
            </ul>
        </div>
    `)}export{d as a,v as i,u as r};
