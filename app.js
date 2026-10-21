"use strict";
const filters=document.querySelector('.filters');
if(filters){
 filters.hidden=false;
 filters.addEventListener('click',event=>{
  const button=event.target.closest('button[data-category]');
  if(!button)return;
  const category=button.dataset.category;
  let count=0;
  document.querySelectorAll('#products .card').forEach(card=>{card.hidden=category!=='All'&&card.dataset.category!==category;if(!card.hidden)count++;});
  filters.querySelectorAll('button').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});
  document.querySelector('#notice').textContent=count+' products shown';
 });
}
document.querySelectorAll('.photo img').forEach(img=>{function fallback(){img.hidden=true;img.parentElement.classList.add('image-failed');}img.addEventListener('error',fallback);if(img.complete&&img.naturalWidth===0)fallback();});
