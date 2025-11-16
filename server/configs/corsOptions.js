const ngrokOrigin = 'https://unpatterned-centennially-candida.ngrok-free.dev'; // added for testing
const whitelist = [ngrokOrigin, 'http://localhost:3000', 'http://example.com'];

const corsOptions = {
   origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'] 
};

export default corsOptions; 