import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import logo from './scopeAR.svg';

function UserTreeView({ onSelectUser }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:3001/get-users');
        setUsers(response.data.userNames);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <TreeView
      aria-label="user navigator"
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      sx={{ height: 700, flexGrow: 1, maxWidth: 300, overflowY: 'auto' }}
    >
      {/* Users node */}
      <TreeItem nodeId="users" label="Users">
        {users.map((user, index) => (
          <TreeItem 
            key={index} 
            nodeId={`user-${index}`} 
            label={user} 
            onClick={() => onSelectUser(user)} 
          />
        ))}
      </TreeItem>
    </TreeView>
  );
}

function App() {
  const [photoUrls, setPhotoUrls] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [responseContent, setResponseContent] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const selectUser = async (userName) => {
    try {
      const res = await axios.get(`http://localhost:3001/get-photo?user=${encodeURIComponent(userName)}`);
      setPhotoUrls(res.data.photoUrls);
      setCurrentPhotoIndex(0);
      setResponseContent('');
      setAudioUrl('');
    } catch (error) {
      console.error('Error selecting user:', error);
    }
  };

  const fetchData = async () => {
    try {
      if (photoUrls.length > 0) {
        const res = await axios.get(`http://localhost:3001/analyze-image?photoUrl=${encodeURIComponent(photoUrls[currentPhotoIndex])}`);
        setResponseContent(res.data.message.content);
        generateSpeech(res.data.message.content);
      } else {
        console.error('No photo URL available');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const generateSpeech = async (text) => {
    try {
      const response = await axios.get(`http://localhost:3001/generate-speech`, { params: { text: text }, responseType: 'arraybuffer' });
      console.log("Response received from generate-speech:", response);
  
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      setAudioUrl(audioUrl);
    } catch (error) {
      console.error('Error generating speech:', error);
    }
  };
  

  return (
    <div>
      <img src={logo} alt="Logo" style={{ position: 'absolute', left: '10px', top: '10px', height: '35px' }} />
      <h1 style={{ textAlign: 'center', color: '#58595b' }}>WorkLink Insight</h1>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        {/* Left Pane - User TreeView */}
        <div style={{ flex: 1, marginRight: '20px' }}>
          <UserTreeView onSelectUser={selectUser} />
        </div>

        {/* Right Pane - Image Display and Response */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '1000px', height: '600px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            {photoUrls.length > 0 && (
              <img src={photoUrls[currentPhotoIndex]} alt="From Scope AR CMS" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )}
          </div>
          {/* Button and Response Container */}
          <div style={{ maxWidth: '1000px', textAlign: 'center', width: '100%' }}>
            <div>
              <button onClick={() => { setCurrentPhotoIndex(Math.max(currentPhotoIndex - 1, 0)); setResponseContent(''); setAudioUrl(''); }} disabled={currentPhotoIndex === 0}>Previous</button>
              <button onClick={() => { setCurrentPhotoIndex(Math.min(currentPhotoIndex + 1, photoUrls.length - 1)); setResponseContent(''); setAudioUrl(''); }} disabled={currentPhotoIndex === photoUrls.length - 1}>Next</button>
            </div>
            <button onClick={() => { fetchData(); setResponseContent(''); setAudioUrl(''); }} disabled={photoUrls.length === 0}>Analyze Image</button>
            <p>{responseContent || 'No response yet'}</p>
            {audioUrl && <audio controls src={audioUrl}>Your browser does not support the audio element.</audio>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
