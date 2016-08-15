window.addEventListener('load', init, false);

var Colors = {
	orb: 0xF12525,
	beatOrb: 0x62D9FF,
};

var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();
var BPM = 60;

var orb;
var beatArr = [];

function init() {

	// Create Environment
	createScene();
	createLights();

	// Create Objects
	orb = new Orb(50, Colors.orb);
	orb.mesh.position.y = -110;
	scene.add(orb.mesh);

	createBeat();

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

function createBeat() {
	var startingPosX = -1000;

	for(var i=0; i<20; i++) {
		beatArr.push(new Orb(10, Colors.beatOrb));

		beatArr[i].mesh.position.y = -110;
		beatArr[i].mesh.position.x = startingPosX + 100 * i;

		scene.add(beatArr[i].mesh);
	}
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
		this.bounceVel = 0;
		this.maxVel = .0003;
		this.acceleration = .00001;

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
		this.mesh.rotation.z += .003 * deltaTime;
		this.mesh.rotation.x += .0005 * deltaTime;

		this.atRest ? this.bounce() : this.grow();
	}

	grow() {
		if(this.growing && this.currentScale < this.maxScale) {
			this.atRest = false;
			this.currentScale += .005 * deltaTime;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
		}else if(!this.growing && this.currentScale > 1){
			this.currentScale -= .005 * deltaTime;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.atRest = Math.abs(1 - this.currentScale) < .005;
		}
	}

	bounce() {
		if(this.bouncing && this.currentScale <= 1.1) {
			// Use velocity and acceleration to make a smooth transition
			this.bounceVel < this.maxVel ? this.bounceVel += this.acceleration : this.bounceVel = this.maxVel;
			this.currentScale += this.bounceVel * deltaTime;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.bouncing = this.currentScale <= 1.1;
		}else if(!this.bouncing && this.currentScale >= .9) {
			// Use velocity and acceleration to make a smooth transition
			this.bounceVel > -this.maxVel ? this.bounceVel -= this.acceleration : this.bounceVel = -this.maxVel;

			this.currentScale += this.bounceVel * deltaTime;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.bouncing = this.currentScale <= .9;
		}
	}

	move() {
		var dist = BPM * 100 / 60 / 1000; // BPM * distance between beats / seconds per minute / ms
		this.mesh.position.x -= dist * deltaTime;
	}

	toggleGrowing() {
		this.growing = !this.growing;
		this.atRest = false;
	}

}

function loop() {

	newTime = new Date().getTime();
	deltaTime = newTime-oldTime;
	oldTime = newTime;

	orb.animate();

	for(var i=0; i<beatArr.length; i++) {
		beatArr[i].animate();
		beatArr[i].move();

		if(beatArr[i].mesh.position.x < -1000) {
			// Reposition
			var beat = beatArr.splice(i, 1)[0];
			beat.mesh.position.x = beatArr[beatArr.length - 1].mesh.position.x + 100;
			beatArr.push(beat);
			i--;
		}
	}

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