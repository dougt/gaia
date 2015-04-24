dump("hi from sw.js\n")

this.onpush = function(event) {
  dump("hi from sw.js push event\n")
  console.log(event.data);
}