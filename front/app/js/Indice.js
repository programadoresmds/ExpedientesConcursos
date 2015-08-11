$(document).ready(function(){
	//var expediente_seleccionado;
	var expediente = getVarsUrl(); 
	var expediente_seleccionado;
	//var perfil_seleccionado;
	//var url = "http://127.0.0.1:3000/";
    //var url = "http://192.168.0.31:3000/";
	//var url = "http://localhost:3000/";	
	var url = window.location.pathname.split("/")[0];

	
	/*$("#boton_imprimir").click(function(){
		window.print();
	});*/
	
	getExpedientePorId(expediente.id, function(exp_de_base){
		expediente_seleccionado = exp_de_base;		
		//postulacionesDelExpediente(exp_de_base.numero);
		mostrarExpediente();

	});	
	


	
	function mostrarExpediente(){
		$.ajax({
			url: url + "postulacionesDelExpediente/" + expediente_seleccionado.numero,
			type: "GET",
			async: true,
			success: function (postulaciones_json) {
				$("#numero_expediente").text("Índice de Expediente N°" + expediente_seleccionado.numero);
				var postulaciones = JSON.parse(postulaciones_json);	
				var numDefojas =  parseInt(expediente_seleccionado.fojasFijas);

				//DOCUMENTACION FIJA
				
				var perfiles_distintos = _.uniq(_.pluck(postulaciones, "perfil"), function(perfil){
					return perfil.codigo;
				});
				
				console.log(perfiles_distintos);
				
				_.forEach(perfiles_distintos, function(perfil){
					var control_perfil = $("#plantillas .contenedor_perfil").clone();
					control_perfil.find(".nombre_perfil_indice").text("Perfil: " + perfil.codigo + ' - ' + perfil.descripcion);
					control_perfil.find(".detalle_del_perfil_indice").text("Nivel: " + perfil.nivel + '. Agrupamiento: ' + perfil.agrupamiento + '. Vacantes: ' + perfil.vacantes + '. Comité: ' + perfil.comite);
					$("#contenedor_indice").append(control_perfil);
					$('#contenedor_indice').append("<br />");	
					
					_.forEach(
						_.sortBy(
							_.filter(postulaciones, 
									 function(p){return p.perfil.codigo == perfil.codigo}), 
							function(p) {return p.fechaDeInclusionEnExpediente;}),  function(postulacion){
						//console.log(postulacion);
						var control_identificacion = $("#plantillas .identificacion").clone();
						control_identificacion.text(postulacion.postulante.apellido + ", " + postulacion.postulante.nombre + ' (DNI: ' + postulacion.postulante.dni + ') ');
						
						//control_identificacion.find("#col3").text("Documento");
						//control_identificacion.find("#col4").text("FOLIO");
						$('#contenedor_indice').append(control_identificacion);	
						$('#contenedor_indice').append("<br />");	
						$('#contenedor_indice').append($("#plantillas .col3").clone().text("Documento"));	
						$('#contenedor_indice').append($("#plantillas .col4h").clone().text("Hasta Foja"));	
						$('#contenedor_indice').append($("#plantillas .col4d").clone().text("Desde Foja"));	
						
						_.forEach(_.sortBy(postulacion.documentacionPresentada, function(d){return parseInt(d.orden);}), function(documento){
							var control_indice_variable = $("#plantillas .indice").clone();
							//control_indice_variable.find("#dni").text(postulacion.postulante.dni);
							//control_indice_variable.find("#nombre").text(postulacion.postulante.apellido + ", " + postulacion.postulante.nombre);
							control_indice_variable.find("#documento").text(documento.descripcion);
							
							var fojasDesde = (numDefojas + 1);
							numDefojas += parseInt(documento.cantidadFojas);
							var fojasHasta = numDefojas;
							control_indice_variable.find(".numero_folioH").text(fojasHasta);
							control_indice_variable.find(".numero_folioD").text(fojasDesde);
							
							$('#contenedor_indice').append(control_indice_variable);
						

						});
						$('#contenedor_indice').append("<hr/>");					
					});
						var hr = $("<hr/>");
						hr.attr('style','border-top: 3px dotted #D3D3D3;')
						$('#contenedor_indice').append(hr);	
				});
                window.print();
			},
			error: function (XMLHttpRequest, textStatus, errorThrown) {
			   alertify.error("error al obtener expediente");
			}
		});
	}
		

	//cargar_expedientes();
	//cargar_panel_agregar_postulantes();
	
	function getVarsUrl() {
		  var url = location.search.replace("?", "");
		  var arrUrl = url.split("&");
		  var urlObj = {};
		  for (var i = 0; i < arrUrl.length; i++) {
			  var x = arrUrl[i].split("=");
			  urlObj[x[0]] = x[1]
		  }
	  return urlObj;
	};
	
	function getExpedientePorId(id, callback) {	
		$.ajax({
			url: url + "getExpedientePorId/" + id,
			type: "GET",
			async: false,
			success: function (respuestaJson) {
				var expediente = JSON.parse(respuestaJson);	
				callback(expediente);
			},
			error: function (XMLHttpRequest, textStatus, errorThrown) {
			   alertify.error("error al obtener expediente");
			}
		});
	};
	
});


