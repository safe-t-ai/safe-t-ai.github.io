import{a as l,D as m}from"./DurhamMap-BWv3m0YO.js";class g{constructor(){this.data={},this.map=null}async initialize(){const[i,o,e,a,t]=await Promise.all([l.getTest1Report(),l.getCrashReport(),l.getBudgetAllocation(),l.getDemandReport(),l.getChoroplethData()]);this.data={volumeReport:i,crashReport:o,budgetAllocation:e,demandReport:a,choroplethData:t};const s=document.getElementById("tract-count");s&&(s.textContent=String(t.features.length)),this.renderMethodology(),this.renderMap(),this.renderTestCards()}renderMap(){this.map=new m("overview-map").initialize();const i=this.data.choroplethData.features.map(t=>t.properties.median_income).filter(t=>t!=null).sort((t,s)=>t-s),o=(t,s)=>t[Math.floor(t.length*s)],e=[.2,.4,.6,.8].map(t=>o(i,t)),a=t=>`$${Math.round(t/1e3)}k`;this.map.addChoroplethLayer(this.data.choroplethData,{valueField:"median_income",colors:["#b45309","#d97706","#e2e8f0","#0891b2","#155e75"],breaks:[...e,1/0],fillOpacity:.7,popupFields:[{label:"Median Income",field:"median_income",format:t=>`$${t==null?void 0:t.toLocaleString()}`},{label:"Population",field:"total_population",format:t=>t==null?void 0:t.toLocaleString()},{label:"Minority %",field:"pct_minority",format:t=>`${t==null?void 0:t.toFixed(1)}%`}]}),this.map.addLegend({title:"Median Household Income",colorScale:[{color:"#b45309",label:`< ${a(e[0])}`},{color:"#d97706",label:`${a(e[0])} – ${a(e[1])}`},{color:"#e2e8f0",label:`${a(e[1])} – ${a(e[2])}`},{color:"#0891b2",label:`${a(e[2])} – ${a(e[3])}`},{color:"#155e75",label:`> ${a(e[3])}`}]}),this.map.fitBounds(this.data.choroplethData),this._onResize=()=>{var t;this.map&&((t=document.getElementById("overview-map"))==null?void 0:t.offsetParent)!==null&&this.map.invalidateSize()},window.addEventListener("resize",this._onResize)}cleanup(){this._onResize&&(window.removeEventListener("resize",this._onResize),this._onResize=null),this.map&&(this.map.cleanup(),this.map=null)}renderMethodology(){const i=document.querySelector(".overview-right"),o=document.createElement("div");o.className="methodology-key",o.innerHTML=`
            <h3>Data Sources &amp; Vocabulary</h3>
            <div class="methodology-legend">
                <div class="methodology-item">
                    <span class="methodology-dot real"></span>
                    <span><strong>Real</strong> <span class="methodology-desc">— Census, NCDOT, and OpenStreetMap inputs</span></span>
                </div>
                <div class="methodology-item">
                    <span class="methodology-dot modeled"></span>
                    <span><strong>Modeled</strong> <span class="methodology-desc">— parametric models grounded in real infrastructure data</span></span>
                </div>
                <div class="methodology-item">
                    <span class="methodology-dot simulated"></span>
                    <span><strong>Simulated</strong> <span class="methodology-desc">— synthetic outputs replacing proprietary vendor data</span></span>
                </div>
            </div>
            <p class="methodology-vocab"><strong>Q1</strong> = lowest-income 20% of tracts; <strong>Q5</strong> = highest-income 20%. Each quintile contains the same number of census tracts.</p>
        `,i.appendChild(o)}renderTestCards(){const{volumeReport:i,crashReport:o,budgetAllocation:e,demandReport:a}=this.data,t=o.error_by_quintile["Q1 (Poorest)"],s=o.error_by_quintile["Q5 (Richest)"],r={test:"test1",label:"Volume Estimation",value:`${Math.abs(i.by_income.equity_gap.gap).toFixed(1)}pp`,finding:"Accuracy gap between highest and lowest income quintiles"},p=[{test:"test2",label:"Crash Prediction",value:`${t.error_pct.toFixed(0)}% vs ${s.error_pct.toFixed(0)}%`,finding:"Q1 vs Q5 prediction error rate"},{test:"test3",label:"Infrastructure",value:`${(e.ai_allocation.disparate_impact_ratio*100).toFixed(1)}%`,finding:"Disparate impact ratio in AI budget allocation"},{test:"test4",label:"Suppressed Demand",value:`${a.summary.suppression_rate.toFixed(0)}%`,finding:"Potential demand suppressed by poor infrastructure"}],d=document.getElementById("overview-cards");d.innerHTML=`
            <button class="stat-hero" data-test="${r.test}">
                <div class="stat-label">${r.label}</div>
                <div class="stat-value">${r.value}</div>
                <div class="stat-desc">${r.finding}</div>
            </button>
            <div class="stat-row">
                ${p.map(n=>`
                    <button class="stat-secondary" data-test="${n.test}">
                        <div class="stat-label">${n.label}</div>
                        <div class="stat-value">${n.value}</div>
                        <div class="stat-desc">${n.finding}</div>
                    </button>
                `).join("")}
            </div>
        `,d.addEventListener("click",n=>{const c=n.target.closest("[data-test]");c&&window.dispatchEvent(new CustomEvent("navigate-test",{detail:c.dataset.test}))})}}export{g as OverviewDashboard};
