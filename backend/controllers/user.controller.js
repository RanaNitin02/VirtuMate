import User from '../models/user.model.js';
import uploadToCloudinary from '../config/cloudinary.js';
import geminiResponse from '../gemini.js';
import moment from 'moment/moment.js';

export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: "get user error" });
    }
}


export const updateAssistant = async (req, res) => {
    try {

        const { assistantName, imageURL } = req.body;
        let assistantImage;

        if (req.file) {
            assistantImage = await uploadToCloudinary(req.file.path);
        } else {
            assistantImage = imageURL;
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { assistantName, assistantImage },
            { new: true }
        ).select("-password");

        return res.status(200).json(user);

    } catch (error) {
        // console.error("Update Assistant Error:", error);
        return res.status(500).json({ message: "update assistant error" });
    }
}


export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;

    
    if (!command || typeof command !== 'string' || !command.trim()) {
      return res.status(400).json({ message: "Command is required." });
    }

    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    
    user.history.push(command);
    await user.save();

    const userName = user.name;
    const assistantName = user.assistantName; 

    const geminiRes = await geminiResponse(command, assistantName, userName);
    const jsonMatch = geminiRes && geminiRes.match(/{[\s\S]*}/);

    if (!jsonMatch) {
      return res.status(400).json({ message: "Sorry! I can't understand." });
    }

    let gemResult;
    try {
      gemResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      return res.status(400).json({ message: "Invalid response from Gemini." });
    }

    const { type, userInput, response } = gemResult;

    switch (type) {
      case 'get-date':
        return res.json({ type, userInput, response: `Today's date is ${moment().format('YYYY-MM-DD')}` });
      case 'get-time':
        return res.json({ type, userInput, response: `Current time is ${moment().format('hh:mm A')}` });
      case 'get-day':
        return res.json({ type, userInput, response: `Today is ${moment().format('dddd')}` });
      case 'get-month':
        return res.json({ type, userInput, response: `Current month is ${moment().format('MMMM')}` });

      case 'general':
      case 'google-search':
      case 'youtube-search':
      case 'youtube-play':
      case 'calculator-open':
      case 'instagram-open':
      case 'facebook-open':
      case 'weather-show':
        return res.json({ type, userInput, response });

      default:
        return res.status(400).json({ message: "I did not understand that command." });
    }

  } catch (error) {
    console.error("askToAssistant error:", error);
    return res.status(500).json({ message: "ask assistant error" });
  }
};

