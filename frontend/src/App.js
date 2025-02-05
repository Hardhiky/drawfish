import React, { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

function App() {
  const [gameFen, setGameFen] = useState("start");
  const [isLoading, setIsLoading] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]); // Store move history
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // Track current move index
  const [promotionModal, setPromotionModal] = useState(null); // Track promotion modal state
  const gameRef = useRef(new Chess()); // Persist chess.js instance

  // Fetch the initial game state once
  useEffect(() => {
    fetch("http://localhost:5000/api/game")
      .then((response) => response.json())
      .then((data) => {
        setGameFen(data.fen);
        gameRef.current.load(data.fen);
      })
      .catch((error) => console.error("Error fetching game state:", error));
  }, []);

  const onDrop = async (sourceSquare, targetSquare) => {
    const fromPiece = gameRef.current.get(sourceSquare);
    if (!fromPiece) return false;

    const isPawn = fromPiece.type === "p";
    const isPromotionSquare =
      (fromPiece.color === "w" && targetSquare[1] === "8") ||
      (fromPiece.color === "b" && targetSquare[1] === "1");

    if (isPawn && isPromotionSquare) {
      // Open promotion modal
      setPromotionModal({ sourceSquare, targetSquare });
      return false; // Do not complete the move yet
    }

    // Attempt to make the move
    const move = gameRef.current.move({
      from: sourceSquare,
      to: targetSquare,
    });

    if (!move) {
      alert("Invalid move!");
      return false;
    }

    // Update move history
    const newMoveHistory = [...moveHistory.slice(0, currentMoveIndex + 1), move.san];
    setMoveHistory(newMoveHistory);
    setCurrentMoveIndex(newMoveHistory.length - 1);

    setGameFen(gameRef.current.fen());
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: sourceSquare,
          to: targetSquare,
        }),
      });

      const data = await response.json();
      if (data.success && data.botMove) {
        console.log("🤖 Bot Move:", data.botMove);

        // Apply bot's move directly
        const botMove = gameRef.current.move({
          from: data.botMove.substring(0, 2),
          to: data.botMove.substring(2, 4),
          promotion: data.botMove.length > 4 ? data.botMove[4].toLowerCase() : undefined, // Ensure lowercase
        });

        if (!botMove) {
          alert("Invalid bot move!");
          return false;
        }

        // Update move history with bot's move
        setMoveHistory([...newMoveHistory, botMove.san]);
        setCurrentMoveIndex(newMoveHistory.length);

        setGameFen(gameRef.current.fen());
      } else {
        gameRef.current.undo();
        setGameFen(gameRef.current.fen());
        alert(data.error || "Invalid move");
      }
    } catch (error) {
      console.error("❌ Error making move:", error);
    } finally {
      setIsLoading(false);
    }

    return true;
  };

  // Handle promotion piece selection via modal
  const handlePromotionSelection = (piece) => {
    if (!promotionModal) return;

    const { sourceSquare, targetSquare } = promotionModal;

    // Complete the move with the selected promotion piece
    const move = gameRef.current.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece,
    });

    if (!move) {
      alert("Invalid promotion!");
      return;
    }

    // Update move history
    const newMoveHistory = [...moveHistory.slice(0, currentMoveIndex + 1), move.san];
    setMoveHistory(newMoveHistory);
    setCurrentMoveIndex(newMoveHistory.length - 1);

    setGameFen(gameRef.current.fen());
    setPromotionModal(null); // Close the modal

    // Send the move to the backend
    setIsLoading(true);
    fetch("http://localhost:5000/api/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.botMove) {
          console.log("🤖 Bot Move:", data.botMove);

          // Apply bot's move directly
          const botMove = gameRef.current.move({
            from: data.botMove.substring(0, 2),
            to: data.botMove.substring(2, 4),
            promotion: data.botMove.length > 4 ? data.botMove[4].toLowerCase() : undefined, // Ensure lowercase
          });

          if (!botMove) {
            alert("Invalid bot move!");
            return;
          }

          // Update move history with bot's move
          setMoveHistory([...newMoveHistory, botMove.san]);
          setCurrentMoveIndex(newMoveHistory.length);

          setGameFen(gameRef.current.fen());
        } else {
          gameRef.current.undo();
          setGameFen(gameRef.current.fen());
          alert(data.error || "Invalid move");
        }
      })
      .catch((error) => console.error("❌ Error making move:", error))
      .finally(() => setIsLoading(false));
  };

  // Reset the game
  const resetGame = () => {
    fetch("http://localhost:5000/api/reset", { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        setGameFen(data.fen);
        gameRef.current.load(data.fen);
        setMoveHistory([]); // Clear move history
        setCurrentMoveIndex(-1); // Reset move index
        setPromotionModal(null); // Clear promotion modal
      })
      .catch((error) => console.error("Error resetting game:", error));
  };

  // Navigate to a specific move in the history
  const goToMove = (index) => {
    gameRef.current.reset(); // Reset the board
    for (let i = 0; i <= index; i++) {
      gameRef.current.move(moveHistory[i]); // Replay moves up to the selected index
    }
    setGameFen(gameRef.current.fen());
    setCurrentMoveIndex(index);
    setPromotionModal(null); // Clear promotion modal
  };

  return (
     <>
	  <h1 style={{ fontSize: "50px",textAlign: "center", marginBottom: "10px" }}>Drawfish</h1>
	  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginRight: "50px"  }}>
           
        <div style={{ marginBottom: "20px" }} style={{width:"70%",paddingTop:"50px"}}>
	  <center>
	            <Chessboard
            position={gameFen}
            onPieceDrop={onDrop}
            arePiecesDraggable={!isLoading}
	    boardWidth={700}
            customBoardStyle={{
               borderRadius: "4px",
               boxShadow: "0 3px 10px rgba(0, 0, 0, 0.3)",
            }}
          />
	          <button onClick={resetGame} disabled={isLoading} style={{ margin: "30px 0px", fontSize: "14px" , background:"black",border:"none", color:"white",fontSize:"20px", padding:"10px 20px"}}>
          Reset Game
        </button>
	  </center>
        </div>
	  <div style={{ alignSelf: "flex-start", marginTop: "10px" }}>

        {/* Promotion Modal */}
        {promotionModal && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#fff",
              padding: "20px",
              border: "1px solid #ccc",
              zIndex: 1000,
              boxShadow: "0 5px 15px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3>Select Promotion Piece:</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => handlePromotionSelection("q")}>Queen</button>
              <button onClick={() => handlePromotionSelection("r")}>Rook</button>
              <button onClick={() => handlePromotionSelection("b")}>Bishop</button>
              <button onClick={() => handlePromotionSelection("n")}>Knight</button>
            </div>
          </div>
        )}
      </div>

      {/* Move History Sidebar */}
<div style={{ 
    width: "400px",
    height: "380px",
    display: "flex",
    flexDirection: "column",
		padding:"10px",
		border:"7px solid white",
    backgroundColor: "#b48c64",
    gap: "8px"
  }}>
    <h3 style={{ 
      fontSize: "30px", 
      margin: 0,
      color: "#ffe7b3",
      textAlign:"center",
      paddingBottom: "4px",
      borderBottom: "1px solid #ddd"
    }}>
      Move History
    </h3>
    <div style={{ 
      flex: 1,
      overflowY: "auto",
      fontSize: "20px",
      border: "none",
		    width:"400px",
      borderRadius: "4px",
      padding: "6px"
    }}>
      {moveHistory.map((move, index) => (
        <div
          key={index}
          style={{
            cursor: "pointer",
                      padding: "4px",
            margin: "2px 20px",
			  width:"100px",
			  color:"#fff7e6",
            borderRadius: "3px",
            transition: "background-color 0.2s"
          }}
          onClick={() => goToMove(index)}
        >
          {`${index + 1}. ${move}`}
        </div>
      ))}
    </div>
  </div>
</div>
	  </>
  );
}

export default App;

