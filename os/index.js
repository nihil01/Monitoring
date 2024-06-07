import http from 'http';
import EventEmitter from 'events';

const eventEmitter = new EventEmitter();
let body = ''
const server = http.createServer(function(req, res){
if(req.method === 'POST'){
    console.log('post')
    req.on('data', function(data){
        body+=data
    })
    req.on('end', function(){
        res.writeHead(200, {'Content-Type': 'application/json'})
        res.write(body);
        res.end()

        eventEmitter.emit('dataReceived', body)
    })
}else if(req.method === 'GET' && req.url === '/'){
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><body><h1>Welcome to the server!</h1></body></html>');
    res.end();
}else{
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.write('Not found')
    res.end();
}
})

const port = 9999
server.listen(port, ()=>{
    const {port, address} = server.address();
    console.log(`Listening on ${address}:${port}`)
})

eventEmitter.on('dataReceived', (newBody) => {
    body = newBody
})

export { eventEmitter, body}
