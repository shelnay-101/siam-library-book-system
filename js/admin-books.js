import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
import {db,$,esc,locationText,bookUrl,requireAdmin} from "./db.js";
import {attachShelfPicker} from "./shelfpicker.js";
if(await requireAdmin()){
 const form=$("#book-form"),panel=$("#book-form-panel"),tbody=$("#books-table");let books=[];
 const fields=["title","author","isbn","category","total-copies","available-copies","floor","section","shelf","row-label","position-label","description","cover-url"];
 const val=id=>$("#"+id).value.trim();
 const picker=attachShelfPicker($("#floor"),$("#shelf")); // floor + shelf become dropdowns tied to the map
 function clearForm(){form.reset();$("#book-id").value="";$("#total-copies").value=1;$("#available-copies").value=1;picker?.set("","");$("#book-form-title").textContent="Add a book";panel.classList.add("hidden");$("#book-message").textContent="";}
 function render(){const q=$("#book-search").value.toLowerCase();const rows=books.filter(b=>[b.title,b.author,b.category].join(" ").toLowerCase().includes(q));tbody.innerHTML=rows.map(b=>`<tr><td><strong>${esc(b.title)}</strong><br><span class="muted small">${esc(b.author)}</span></td><td>${esc(locationText(b))}</td><td>${b.available_copies}/${b.total_copies}</td><td class="actions"><button class="mini-btn" data-edit="${b.id}">Edit</button><button class="mini-btn" data-qr="${b.id}">QR Code</button><button class="mini-btn danger-text" data-delete="${b.id}">Delete</button></td></tr>`).join("")||'<tr><td colspan="4">No books found.</td></tr>';}
 async function load(){const {data,error}=await db.from("books").select("*").order("created_at",{ascending:false});if(error){tbody.innerHTML=`<tr><td colspan="4">${esc(error.message)}</td></tr>`;return;}books=data||[];render();}
 $("#new-book").onclick=()=>{clearForm();panel.classList.remove("hidden");panel.scrollIntoView({behavior:"smooth"});};
 $("#cancel-edit").onclick=clearForm;$("#book-search").oninput=render;
 form.addEventListener("submit",async e=>{e.preventDefault();const total=Number(val("total-copies")),available=Number(val("available-copies"));if(available>total){$("#book-message").textContent="Available copies cannot exceed total copies.";return;}
  const payload={title:val("title"),author:val("author"),isbn:val("isbn")||null,category:val("category")||null,total_copies:total,available_copies:available,floor:val("floor"),section:val("section"),shelf:val("shelf"),row_label:val("row-label")||null,position_label:val("position-label")||null,description:val("description")||null,cover_url:val("cover-url")||null,updated_at:new Date().toISOString()};
  const id=val("book-id");const result=id?await db.from("books").update(payload).eq("id",id):await db.from("books").insert(payload);
  $("#book-message").textContent=result.error?result.error.message:"Saved successfully.";if(!result.error){clearForm();await load();}
 });
 tbody.addEventListener("click",async e=>{
  const edit=e.target.dataset.edit,del=e.target.dataset.delete,qr=e.target.dataset.qr;
  if(edit){const b=books.find(x=>x.id===edit);$("#book-id").value=b.id;const ids=["title","author","isbn","category","total-copies","available-copies","floor","section","shelf","row-label","position-label","description","cover-url"];const vals=[b.title,b.author,b.isbn,b.category,b.total_copies,b.available_copies,b.floor,b.section,b.shelf,b.row_label,b.position_label,b.description,b.cover_url];ids.forEach((id,i)=>$("#"+id).value=vals[i]??"");picker?.set(b.floor,b.shelf);$("#book-form-title").textContent="Edit book";panel.classList.remove("hidden");panel.scrollIntoView({behavior:"smooth"});}
  if(del&&confirm("Delete this book? Related requests will also be deleted.")){const {error}=await db.from("books").delete().eq("id",del);if(error)alert(error.message);await load();}
  if(qr){const b=books.find(x=>x.id===qr);$("#qr-book-title").textContent=b.title;const canvas=document.createElement("canvas");await QRCode.toCanvas(canvas,bookUrl(b.id),{width:260,margin:2});$("#qr-output").replaceChildren(canvas);$("#qr-modal").classList.remove("hidden");$("#download-qr").onclick=()=>{const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`book-${b.id}-qr.png`;a.click();};}
 });
 $("#close-qr").onclick=()=>$("#qr-modal").classList.add("hidden");
 await load();
}
