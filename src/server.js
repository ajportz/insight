const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());

const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Function to make GraphQL requests
async function makeGraphQLRequest(query, variables) {
  return axios.post('https://cms.scopear.com/api/v3/graphql', { query, variables }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SCOPE_AR_API_KEY}`
    }
  });
}

// Endpoint to get user names from Scope AR's CMS
app.get('/get-users', async (req, res) => {
    const graphqlQuery = {
      query: `
        query FetchScenarioSessionEvents($valueTypes: [ScenarioStepItemTypeEnum!], $first: Int!, $scenarioSessionId: ID) {
          scenarioSessionEvents(first: $first, valueTypes: $valueTypes, scenarioSessionId: $scenarioSessionId) {
            nodes {
              eventData
            }
          }
        }
      `,
      variables: {
        "scenarioSessionId": "123456789",
        "first": 100,
        "valueTypes": ["PHOTO"]
      }
    };
  
    try {
      const cmsResponse = await makeGraphQLRequest(graphqlQuery.query, graphqlQuery.variables);
      const userNames = cmsResponse.data.data.scenarioSessionEvents.nodes
        .map(node => {
          // Check if eventData is a string and needs parsing
        let eventData = node.eventData;
        if (typeof eventData === 'string') {
            try {
                eventData = JSON.parse(eventData);
            } catch (parseError) {
                console.error('Error parsing eventData:', parseError);
                // Return null if eventData can't be parsed
                return null;
            }
        }
          return eventData.user_name;
        })
        .filter((userName, index, self) => userName && self.indexOf(userName) === index);
  
      res.json({ userNames });
    } catch (error) {
      console.error('Error fetching user names:', error);
      res.status(500).send('Error fetching user names');
    }
  });

// Endpoint to get photo URLs from Scope AR's CMS
app.get('/get-photo', async (req, res) => {
    try {
      const userFilter = req.query.user; // Retrieve user filter from query parameters
  
      const graphqlQuery = {
        query: `
          query FetchScenarioSessionEvents($valueTypes: [ScenarioStepItemTypeEnum!], $first: Int!, $scenarioSessionId: ID) {
            scenarioSessionEvents(first: $first, valueTypes: $valueTypes, scenarioSessionId: $scenarioSessionId) {
              nodes {
                id
                type
                eventData
                photo {
                  fileUrl
                }
                scenarioSessionStep {
                  scenarioStep {
                    id
                    name
                  }
                }
              }
            }
          }
        `,
        variables: {
          "scenarioSessionId": "135395",
          "first": 300, // Adjust the number of photos to fetch
          "valueTypes": ["PHOTO"]
        }
      };
  
      const cmsResponse = await axios.post('https://cms.scopear.com/api/v3/graphql', graphqlQuery, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SCOPE_AR_API_KEY}`
        }
      });
  
      if (!cmsResponse.data || !cmsResponse.data.data || !cmsResponse.data.data.scenarioSessionEvents.nodes) {
        console.error('Unexpected response structure:', cmsResponse.data);
        return res.status(500).send('Unexpected response structure from CMS');
      }
  
    // Filter photos based on the user, if a user filter is provided
    const filteredPhotos = cmsResponse.data.data.scenarioSessionEvents.nodes
        .filter(node => {
            let eventData = node.eventData;
            if (typeof eventData === 'string') {
                try {
                    eventData = JSON.parse(eventData);
                } catch (e) {
                    console.error('Error parsing eventData:', e);
                    return false;
                }
            }
            return !userFilter || (eventData.user_name && eventData.user_name === userFilter);
        })
        .map(node => node.photo ? node.photo.fileUrl : null)
        .filter(url => url != null);
  
      res.json({ photoUrls: filteredPhotos });
      console.log({ photoUrls: filteredPhotos });
    } catch (error) {
      console.error('Error fetching photos:', error);
      res.status(500).send('Error fetching photos');
    }
  });
  
// Endpoint to analyze the image using OpenAI
app.get('/analyze-image', async (req, res) => {
  const photoUrl = req.query.photoUrl;
  if (!photoUrl) {
    return res.status(400).send('Missing photoUrl query parameter');
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      max_tokens: "300",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What’s in this image?" },
            { type: "image_url", image_url: { "url": photoUrl } }
          ]
        }
      ]
    });

    res.json(response.choices[0]);
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).send('Error processing your OpenAI request');
  }
});

// Endpoint to generate speech from text
app.get('/generate-speech', async (req, res) => {
    const text = req.query.text;
    if (!text) {
      return res.status(400).send('Missing text query parameter');
    }
  
    try {
      const speechResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });
  
      const buffer = Buffer.from(await speechResponse.arrayBuffer());
      res.set('Content-Type', 'audio/mpeg');
      res.send(buffer);
    } catch (error) {
      console.error('Error with OpenAI TTS API:', error);
      res.status(500).send('Error generating speech');
    }
  });
  

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
