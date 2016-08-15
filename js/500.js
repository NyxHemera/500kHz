window.addEventListener('load', init, false);

var Colors = {
	orb: 0xF03A3A,
	black: 0x000000,
};

var orb;
//var orb2;

function init() {

	// Create Environment
	createScene();
	createLights();

	// Create Objects
	orb = new Orb(50, 0xF12525);
	orb.mesh.position.y = -110;
	scene.add(orb.mesh);

/*	orb2 = new Orb();
	orb2.mesh.position.y = (-HEIGHT * getPPU(orb2))/2 - getActualWidth(orb2)/2;
	console.log(getVisibleHeight(orb2) / 50);
	console.log(getPPU(orb2));
	console.log((-HEIGHT * getPPU(orb2))/2);
	scene.add(orb2.mesh);*/

	// Handle input
	document.addEventListener('mousedown', handleMouseDown, false);
	document.addEventListener('mouseup', handleMouseUp, false);
	document.addEventListener('touchstart', handleMouseDown, false);
	document.addEventListener('touchend', handleMouseUp, false);

	// run Gameloop
	loop();

}

var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane,
	HEIGHT, WIDTH, renderer, container;

function createScene() {

	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	scene = new THREE.Scene();

	scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	camera.position.x = 0;
	camera.position.z = 300;
	camera.position.y = 0;

	renderer = new THREE.WebGLRenderer({
		alpha: true,
		antialias: true
	});

	renderer.setSize(WIDTH, HEIGHT);
	renderer.shadowMap.enabled = true;

	container = document.getElementById('world');
	container.appendChild(renderer.domElement);

	window.addEventListener('resize', handleWindowResize, false);

}

var hemisphereLight, shadowLight;

function createLights() {

	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);
	shadowLight = new THREE.DirectionalLight(0xffffff, .9);

	shadowLight.position.set(150, 350, 350);
	shadowLight.castShadow = true;

	shadowLight.shadow.camera.left = -400;
	shadowLight.shadow.camera.right = 400;
	shadowLight.shadow.camera.top = 400;
	shadowLight.shadow.camera.bottom = -400;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;

	scene.add(hemisphereLight);
	scene.add(shadowLight);

}

function getActualWidth(obj) {
	return obj.mesh.geometry.parameters.width * obj.mesh.scale.x;
}

function getVisibleHeight(obj) {
	var objWidth = getActualWidth(obj);
	var dist = camera.position.z - obj.mesh.position.z - objWidth/2; // Assumes cube
	var vFOV = camera.fov * Math.PI / 180; // convert vertical fov to radians
	var height = 2 * Math.tan(vFOV / 2) * dist;
	return height;
}

function getPPU(obj) {
	var vH = getVisibleHeight(obj);
	return getActualWidth(obj) / vH;
}

class Orb {

	constructor(size, color) {
		this.growing = false; // True if growing, false if shrinking
		this.atRest = true; // Is available for bouncing
		this.bouncing = false; // True if growing, false if shrinking

		this.currentScale = 1;
		this.maxScale = 1.5;

		this.geom = new THREE.BoxGeometry(size, size, size);
		this.geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));

		this.geom.mergeVertices();

		this.mat = new THREE.MeshPhongMaterial({
			color: color,
			transparent: true,
			opacity: .8,
			shading: THREE.FlatShading,
		});

		this.mesh = new THREE.Mesh(this.geom, this.mat);
		this.mesh.receiveShadow = true;
		this.mesh.castShadow = true;
	}

	animate() {
		//this.currentScale = this.mesh.scale.x;
		this.atRest ? this.bounce() : this.grow();
	}

	grow() {
		if(this.growing && this.currentScale < this.maxScale) {
			this.atRest = false;
			this.currentScale += .05;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
		}else if(!this.growing && this.currentScale > 1){
			this.currentScale -= .05;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.atRest = Math.abs(1 - this.currentScale) < .05;
		}
	}

	bounce() {
		if(this.bouncing && this.currentScale <= 1.2) {
			//console.log('1');
			this.currentScale += .003;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.bouncing = this.currentScale <= 1.2;
		}else if(!this.bouncing && this.currentScale >= .8) {
			//console.log('0');
			this.currentScale -= .003;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.bouncing = this.currentScale <= .8;
		}
	}

	toggleGrowing() {
		this.growing = !this.growing;
		this.atRest = false;
	}

}

function loop() {

	orb.mesh.rotation.z += .05;
	orb.mesh.rotation.x += .01;

	orb.animate();

	renderer.render(scene, camera);

	requestAnimationFrame(loop);

}




// Event handlers:
function handleMouseDown() {
	console.log("MouseDown");
	orb.toggleGrowing();
}

function handleMouseUp() {
	console.log("MouseUp");
	orb.toggleGrowing();
}

function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}