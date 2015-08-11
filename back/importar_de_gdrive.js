var GoogleSpreadsheet = require("google-spreadsheet"); 

var fs = require("fs");
var csv = require("fast-csv");
var _ = require("./underscore-min");
var mongodb = require('mongodb');

var uri = 'mongodb://127.0.0.1/ExpedientesConcurso';


mongodb.MongoClient.connect(uri, function(err, db) {  
  	if(err) throw err;
	// spreadsheet key is the long id in the sheets URL 
	var my_sheet = new GoogleSpreadsheet('1tsEs8wpgMtJ0pnt3Q96_ob4VoU34ej17w6gzPM7-QtQ');
	my_sheet.getRows(2, function(err, data_perfiles){
		if(err) console.log("error al abrir hoja de perfiles", err);
		_.forEach(data_perfiles, function(data){
			db.collection('perfiles').update({codigo: data.perfil}, {
				codigo: data.perfil ,
				descripcion: data.descrperfil,
				nivel: data.nivel,
				agrupamiento: data.agrupamiento,
				convocatoria: data.convocatoria,
				comite: data.comite,
				vacantes: data.vacantes					
			}, {
				upsert: true
			}, function(err){
				if(err) console.log("error al importar perfil", err);
			});	
		});
		console.log("importados perfiles");

		my_sheet.getRows(4, function(err, data_documentos){
			if(err) console.log("error al abrir hoja de documentos", err);
				_.forEach(data_documentos, function(data){
					db.collection('documentos').update({codigo: data.codigo}, {
					codigo: data.codigo ,
					descripcion: data.documento
				}, {
					upsert: true
				}, function(err){
					if(err) console.log("error al importar documento", err);
				});			
			});
			console.log("importados documentos");

			my_sheet.getRows(5, function(err, data_cabecera_checklists){
				if(err) console.log("error al abrir hoja de cabeceras de checklists", err);
				_.forEach(data_cabecera_checklists, function(data){
					db.collection('checklists').update({codigo: data.codigo}, {
						$set: {
							codigo: data.codigo ,
							checklist: data.checklist
						}
					}, {
						upsert: true
					}, function(err){
						if(err) console.log("error al importar checklist_cabecera", err);
					});			
				});
				console.log("importados cabeceras checklists");

				my_sheet.getRows(6, function(err, data_detalle_checklists){
					if(err) console.log("error al abrir hoja de detalle checklists", err);

					var col_checklists = db.collection('checklists');
					col_checklists.find({}).toArray(function(err, checklists){
						_.forEach(checklists, function(ch){
							ch.documentacionRequerida = [];
						})

						_.forEach(data_detalle_checklists, function(data){
							var checklist = _.findWhere(checklists, {codigo: data.checklist});
							checklist.documentacionRequerida.push({
								codigo: data.documento,
								orden: data.orden
							});							
						});

						_.forEach(checklists, function(ch){
							col_checklists.save(ch, function(){});
						})
						console.log("importado detalle checklists");

						my_sheet.getRows( 3, function(err, data_postulantes){
							if(err) console.log("error al abrir hoja de postulantes", err);

							_.forEach(data_postulantes, function(data){	
								db.collection('postulantes').update({dni: data.nrodoc}, {
									$set: {
										dni: data.nrodoc,
										apellido: data.apellido,
										nombre: data.nombre,
										mail: data.mail
									}
								}, {
									upsert: true
								}, function(err){
									if(err) console.log("error al importar postulantes", err);
								});	
							});	
							console.log("importados postulantes");								

							my_sheet.getRows( 7, function(err, data_postulaciones){
								if(err) console.log("error al abrir hoja de postulaciones", err);
								var col_postulantes = db.collection('postulantes');
								col_postulantes.find({}).toArray(function(err, postulantes){
									_.forEach(postulantes, function(p){
										if(!p.postulaciones) p.postulaciones = [];
									});
									_.forEach(data_postulaciones, function(data){	
										var postulante = _.findWhere(postulantes, {dni: data.dni});
										var postulacion = _.findWhere(postulante.postulaciones, {codigo: data.postulacion});
										if(!postulacion) {
											postulacion = {
												codigo: data.postulacion,
												documentacionPresentada: []
											};											
											postulante.postulaciones.push(postulacion);	
										}
										postulacion.codigoPerfil = data.codperfil;
										postulacion.codigoChecklist = data.codchecklist;		
									});	
									_.forEach(postulantes, function(p){
										col_postulantes.save(p, function(){});
									});
									console.log("importadas postulaciones");										
								});
							});						
						});	
					});	
				});				
			});				
		});		
	});
});



