function utilizadores (objeto,id){
    let users = JSON.parse(objeto);
    document.getElementById("idU").setAttribute("value",users[id].id)
    document.getElementById("editarNomeU").setAttribute("value",users[id].nome);
    document.getElementById("editarEmailU").setAttribute("value",users[id].email);
    document.getElementById("editarNrU").setAttribute("value",users[id].telemovel);
    document.getElementById("editarMoradaU").setAttribute("value",users[id].morada);
    document.getElementById("editarCodpostU").setAttribute("value",users[id].codpost);
    document.getElementById("editarPaisU").setAttribute("value",users[id].pais);
    document.getElementById("editarCidadeU").setAttribute("value",users[id].cidade);
    document.getElementById("rmvU").setAttribute("href","/rmvUser="+users[id].id);

};
function vendedor (objeto,id,empresa,users){
  let vendedores = JSON.parse(objeto);
  let empresaa = JSON.parse(empresa);
  let userss = JSON.parse(users);
  for(let i =0;i<vendedores.length;i++){
    console.log(empresaa)
    if(vendedores[i].id == id){
      var testeeee = vendedores[i].user_id
      document.getElementById("id").setAttribute("value",id)
      for(let j = 0;j<empresaa.length;j++){
        if(empresaa[j].id==vendedores[i].empresa_id){
          document.getElementById("editarIDEV").setAttribute("value",empresaa[j].nome);
        }
      }
      for(let u =0;u<userss.length;u++){
        if(userss[u].id==testeeee){
          document.getElementById("editarIDV").setAttribute("value",userss[u].nome);
        }
      }
      if (vendedores[i].estado == 1){

        document.getElementById("editarEstadoV").value = 1;
      }else{
        document.getElementById("editarEstadoV").value = 0;
      }
    }
  }
};
function empresas (objeto,id){
    let empresa = JSON.parse(objeto);
    document.getElementById("editaridE").setAttribute("value",empresa[id-1].id);
    document.getElementById("editarNomeE").setAttribute("value",empresa[id-1].nome);
    document.getElementById("editarEmailE").setAttribute("value",empresa[id-1].email);
    document.getElementById("editarMoradaE").setAttribute("value",empresa[id-1].morada);
    document.getElementById("editarCidadeE").setAttribute("value",empresa[id-1].cidade);
    document.getElementById("editarCodpostE").setAttribute("value",empresa[id-1].codpost);
    document.getElementById("editarPaisE").setAttribute("value",empresa[id-1].pais);
    document.getElementById("rmvEmp").setAttribute("href","rmvEmp="+empresa[id-1].id)
}
function produtos(produtos,categorias,subcat,id){

  let produto = JSON.parse(produtos);
  let categoria = JSON.parse(categorias);
  let subcats = JSON.parse(subcat);
  var i,j,u;
  for (i=0;i<produto.length;i++){
    if(produto[i].id == id){
   
      for(j=0;j<subcats.length;j++){
        if(subcats[j].id == produto[i].subcategoria_id){
          
          for(u=0;u<categoria.length;u++){
            if(categoria[u].id == subcats[j].categoria_id){

              document.getElementById("rmvProd").setAttribute("href","/rmvProd="+produto[i].id)
              document.getElementById("editProdId").setAttribute("value",produto[i].id)
              document.getElementById("eNomeProd").setAttribute("value",produto[i].nome);
              document.getElementById("precoProd").setAttribute("value",produto[i].preco);
              document.getElementById("quantProd").setAttribute("value",produto[i].quantidade);
              document.getElementById("catProd").value= categoria[u].id;
              select(subcats,categoria[u].id)
              document.getElementById("subcatProd").value=subcats[j].id;
              document.getElementById("descProd").setAttribute("value",produto[i].descricao);
              document.getElementById("descontoProd").setAttribute("value",produto[i].desconto);
              document.getElementById("imgProd").src = "/public/images/produtos/"+produto[i].foto;
              break;
            }
          }
        }
      }

    }
  }
  
};
function select (subcat,id){
  if ( typeof subcat === 'string'){
    subcat = JSON.parse(subcat);
  }
 document.getElementById("subcatProd").innerHTML="";
  subcat.forEach(element => {

    if(element.categoria_id == id){
      const option = document.createElement("option");
       option.value = element.id;
       option.text = element.nome;
       document.getElementById("subcatProd").appendChild(option);
    }
  }); 
}
function total (subtotal){
  if (document.getElementById("free-shipping").checked){
    document.getElementById("total").innerHTML = (parseFloat(subtotal) + 10).toFixed(2) + "€";
    document.getElementById("pagamento").innerHTML = "Transferencia Bancária";
    document.getElementById("estado").setAttribute("value","Pendente");
    document.getElementById("totalEnc").setAttribute("value",(parseFloat(subtotal)+10).toFixed(2)); 
  }else if (document.getElementById("standart-shipping")){
    document.getElementById("total").innerHTML = (parseFloat(subtotal) + 20).toFixed(2) + "€";
     document.getElementById("pagamento").innerHTML = "À cobrança";
     document.getElementById("estado").setAttribute("value","Aceite");
     document.getElementById("totalEnc").setAttribute("value",(parseFloat(subtotal)+20).toFixed(2)); 
  }
};
function encomenda (infoProd,produtos,id,encomendas,a,emp){
  switch(a){
    case 0: document.getElementById("encID").innerHTML = "  <button  type='submit'  class='btn btn-outline-primary-2' >  <span>Enviar</span>  <i class='icon-long-arrow-right'></i> </button>";break;
    case 1: document.getElementById("encID").innerHTML = "  <button  type='submit'  class='btn btn-outline-primary-2' >  <span>Entregue</span>  <i class='icon-long-arrow-right'></i> </button>";break;
    case 2: document.getElementById("encID").innerHTML = "";break;
    default: break;
  }
  let teste = JSON.parse(encomendas)
  console.log(emp);
  document.getElementById("encID").setAttribute("action",`/enviarEnc/${id}/${emp}`)
  for (let i = 0; i<teste.length;i++){
    if (teste[i].id == id){
      
      document.getElementById("destino").innerHTML = teste[i].destino;
      document.getElementById("destino2").innerHTML = teste[i].destino;
    }
  }
  let table = document.getElementById("encTable");
  let table2 = document.getElementById("encTable2");
  let rows = table.rows;
  let rows2 = table2.rows;
  for (let i =1;i<rows.length;i++){
    rows[i].innerHTML  = "";
  }
  for (let i =1;i<rows2.length;i++){
    rows2[i].innerHTML  = "";
  }
  let produto = JSON.parse(produtos);
  let infoProds = JSON.parse(infoProd);
 produto.forEach((produto) => {
  if (produto.encomenda_id == id){
    const row = table.insertRow();
    const row2 =table2.insertRow(); 
    const nome = row.insertCell();
    const nome2 = row2.insertCell();
    const preco = row.insertCell();
    const preco2 = row2.insertCell();
    const quantidade = row.insertCell();
    const quantidade2 = row2.insertCell();
    const total = row.insertCell();
    const total2 = row2.insertCell();
    for (let i = 0; i<infoProds.length;i++){
      if (produto.produto_id == infoProds[i].id){
        nome.innerHTML = infoProds[i].nome;
        nome2.innerHTML = infoProds[i].nome;
        preco.innerHTML= produto.total/produto.quantidade + "€";
        preco2.innerHTML= produto.total/produto.quantidade + "€";
        quantidade.innerHTML = produto.quantidade;
        quantidade2.innerHTML = produto.quantidade;
        total.innerHTML = produto.total + "€";
        total2.innerHTML = produto.total + "€";
      }
    }
  }
 })
 
}
const inputElement = document.getElementById("image_homepage");
inputElement.addEventListener("change", (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
    const fileReader = new FileReader();
    const preview = document.getElementById('file-preview');
    fileReader.onload = event => {
    preview.setAttribute('src', event.target.result);
    preview.removeAttribute("hidden"); 
    }
    fileReader.readAsDataURL(arquivo);
    }
});
const inputElementPreview = document.getElementById("imgProdEdit");
  inputElementPreview.addEventListener("change", (e) => {
    const arquivo1 = e.target.files[0];
    if (arquivo1) {
    const fileReader1 = new FileReader();
    const preview1 = document.getElementById('imgProd');
    fileReader1.onload = event => {
    preview1.setAttribute('src', event.target.result);
    }
     fileReader1.readAsDataURL(arquivo1);
     }
 });
    function categoria (a,b){

     const select = b.children[0];
     const subcat = JSON.parse(a);
    
     select.addEventListener('change', function() {
          var selectValue = select.value;
          const selectHide = document.getElementById("selectHide");

          if(selectValue !== "0"){
            selectHide.style.display = "block"
            selectHide.innerHTML = "";

            for (let i=0;i<subcat.length;i++){
              if(subcat[i].categoria_id == selectValue){
                const option = document.createElement('option');
                option.value = subcat[i].id;
                option.text = subcat[i].nome;
                selectHide.appendChild(option);
              }
            }
          }else{
            selectHide.style.display = "none";
          }
     })
    }